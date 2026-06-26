"""
Append-only per-election vote chain (tamper-evident ledger).

Hashes follow the conceptual model SHA-256(f"{block_index}{canonical_vote_data_json}{previous_hash}").
Genesis links use PREVIOUS_HASH_ALL_ZEROS. ``voter_fingerprint`` hashes (user,election,receipt_secret)
without storing raw identifiers in vote_data payloads.
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal
from typing import Iterable, List, Tuple, Union

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.common.core.algorithms import CryptographicAlgorithm
from apps.elections.models import SchoolElection

from .models import VoteBlock, VoteChoice

logger = logging.getLogger(__name__)

# Sentinel previous hash for the first block in an election (64 hex chars, diagram "genesis").
GENESIS_PREVIOUS_HASH = '0' * 64


def canonical_vote_json(vote_data: dict) -> str:
    """Stable JSON string for hashing and verification."""
    return json.dumps(vote_data, sort_keys=True, separators=(',', ':'))


def coerce_db_integral(value: object, field_label: str) -> int:
    """Interpret JSON numbers that round-trip as str/float/Decimal as strict ints."""
    if value is None:
        raise ValueError(f'Missing "{field_label}" in vote ledger vote_data.')
    if isinstance(value, bool):
        raise TypeError(f'"{field_label}" must not be boolean.')
    try:
        if isinstance(value, Decimal):
            return int(value)
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(Decimal(str(value)))
        except (ArithmeticError, TypeError, ValueError) as exc:
            raise ValueError(f'Invalid "{field_label}" for vote ledger: {value}') from exc


def normalize_vote_payload_for_digest(vote_data: Union[dict, None]) -> dict:
    """
    Build a deterministic vote_data dict before hashing — must match PostgreSQL/SQLite
    JSON round-trips where numeric fields may deserialize as Decimal/str/etc.
    """
    if vote_data is None:
        vote_data = {}
    ballot_anchor_raw = vote_data.get('ballot_anchor')
    if ballot_anchor_raw is None or ballot_anchor_raw == '':
        anchor = ''
    elif isinstance(ballot_anchor_raw, (int, Decimal)):
        anchor = str(int(ballot_anchor_raw))
    elif isinstance(ballot_anchor_raw, float) and ballot_anchor_raw.is_integer():
        anchor = str(int(ballot_anchor_raw))
    else:
        anchor = str(ballot_anchor_raw)

    position_id_coerced = coerce_db_integral(vote_data.get('position_id'), 'position_id')
    candidate_id_coerced = coerce_db_integral(vote_data.get('candidate_id'), 'candidate_id')

    stamp = vote_data.get('timestamp')
    if hasattr(stamp, 'isoformat'):
        timestamp_str = stamp.isoformat()
    elif stamp is None:
        timestamp_str = ''
    else:
        timestamp_str = str(stamp)

    normalized = {
        'ballot_anchor': anchor,
        'position_id': position_id_coerced,
        'candidate_id': candidate_id_coerced,
        'timestamp': timestamp_str,
    }
    return normalized


def voter_fingerprint_for_ballot(user_id: int, election_id: int, receipt_secret: str) -> str:
    """
    Bounded-length opaque fingerprint (no raw voter_id in vote_data JSON).
    Tied to ballot receipt payload so auditors cannot correlate without receipt side knowledge.
    """
    return CryptographicAlgorithm.sha256_hash(f'voter:{user_id}:{election_id}:{receipt_secret}')


def _next_block_anchor(election_id: int) -> Tuple[int, str]:
    """
    Within a locked transaction, return (next_block_index, previous_hash).
    """
    aggregates = VoteBlock.objects.filter(election_id=election_id).aggregate(mx=Max('block_index'))
    max_index = aggregates['mx']
    if max_index is None:
        return 1, GENESIS_PREVIOUS_HASH
    last = (
        VoteBlock.objects.filter(election_id=election_id, block_index=max_index)
        .only('current_hash')
        .get()
    )
    return max_index + 1, last.current_hash


def append_vote_blocks_for_ballot(
    *,
    election_id: int,
    ballot_identifier: str,
    receipt_secret: str,
    user_id: int,
    choices: Iterable[VoteChoice],
) -> List[VoteBlock]:
    """
    Append one VoteBlock per VoteChoice after that choice exists in the DB.

    Requires an outer ``transaction.atomic()`` (serializes callers per-election via election row lock).

    Raises:
        RuntimeError: if called outside atomic block or ``choices`` sequence is empty.
    """
    if not transaction.get_connection().in_atomic_block:
        raise RuntimeError('append_vote_blocks_for_ballot must run inside transaction.atomic()')
    resolved = list(choices)
    if not resolved:
        raise RuntimeError('append_vote_blocks_for_ballot expects at least one VoteChoice')

    SchoolElection.objects.select_for_update().get(pk=election_id)
    fingerprint = voter_fingerprint_for_ballot(user_id, election_id, receipt_secret)

    blocks: List[VoteBlock] = []
    next_index, previous_hash = _next_block_anchor(election_id)

    for vote_choice in resolved:
        assert vote_choice.pk is not None
        recorded_at = timezone.now().isoformat()
        vote_data_payload = normalize_vote_payload_for_digest(
            {
                'ballot_anchor': ballot_identifier,
                'position_id': vote_choice.position_id,
                'candidate_id': vote_choice.candidate_id,
                'timestamp': recorded_at,
            }
        )
        canonical = canonical_vote_json(vote_data_payload)
        hashing_payload = f'{next_index}{canonical}{previous_hash}'
        current_hash = CryptographicAlgorithm.sha256_hash(hashing_payload)

        block = VoteBlock(
            election_id=election_id,
            vote_choice=vote_choice,
            block_index=next_index,
            voter_fingerprint=fingerprint,
            vote_data=vote_data_payload,
            previous_hash=previous_hash,
            current_hash=current_hash,
            validator_signature=None,
        )
        block.save()
        blocks.append(block)

        logger.debug(
            'VoteLedger block %s for election=%s ballot_anchor=%s',
            next_index,
            election_id,
            ballot_identifier,
        )

        previous_hash = current_hash
        next_index += 1

    return blocks


def verify_election_vote_chain(election_id: int) -> Tuple[bool, List[str]]:
    """
    Recompute every block hash and walk previous_hash linkage (integrity pass).

    Returns (ok, list of human-readable diagnostics).
    """
    errors: List[str] = []
    rows = list(VoteBlock.objects.filter(election_id=election_id).order_by('block_index'))
    expected_previous = GENESIS_PREVIOUS_HASH
    expected_index = 1

    for block in rows:
        if block.block_index != expected_index:
            errors.append(
                f'Block index discontinuity: expected {expected_index}, got {block.block_index}'
            )
        if block.previous_hash != expected_previous:
            errors.append(
                f'Chain link broken at index {block.block_index}: '
                f'previous_hash does not match prior block digest'
            )
        try:
            normalized_vote_data = normalize_vote_payload_for_digest(block.vote_data)
        except (TypeError, ValueError) as exc:
            errors.append(
                f'Cannot normalize vote_data at index {block.block_index}: {exc}',
            )
            expected_previous = block.current_hash
            expected_index += 1
            continue
        canonical = canonical_vote_json(normalized_vote_data)
        recomputed_digest = CryptographicAlgorithm.sha256_hash(
            f'{block.block_index}{canonical}{block.previous_hash}'
        )
        if recomputed_digest != block.current_hash:
            errors.append(
                f'Hash mismatch at index {block.block_index}: recomputed ledger digest differs from stored hash'
            )
        expected_previous = block.current_hash
        expected_index += 1

    return len(errors) == 0, errors
