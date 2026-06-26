"""
Analytical concurrent-load simulation for E-Botar.

Models what happens when N users act at the same time during peak events
(login rush, voting rush, results browsing). Uses payload sizes and throttle
limits from the current codebase (v3.0 / E_Botar).

Run:
  python manage.py simulate_concurrent_load
  python manage.py simulate_concurrent_load --total-students 2000 --concurrent 100,250,500
  python manage.py simulate_concurrent_load --scenario vote_rush --concurrent 500
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Tuple

from django.core.management.base import BaseCommand


# --- Payload estimates (uncompressed JSON bytes, per user session) ---
PAYLOAD_BYTES = {
    'branding': 1_000,
    'login': 1_200,
    'dashboard_guest': 35_000,
    'dashboard_auth_extra': 3_000,
    'vote_page_load': 85_000,
    'vote_submit': 2_500,
    'results_page': 120_000,
    'my_votes': 4_000,
    'admin_voting_status_page': 120_000,  # 50 lean rows + summary
    'admin_profiles_page': 100_000,
}

# --- Requests per user flow ---
REQUESTS_PER_FLOW = {
    'login_only': [('login', 1)],
    'browse_home': [('branding', 1), ('dashboard_guest', 1)],
    'vote_session': [
        ('login', 1),
        ('vote_page_load', 4),  # me, status, election, candidates
        ('vote_submit', 1),
    ],
    'vote_already_logged_in': [
        ('vote_page_load', 4),
        ('vote_submit', 1),
    ],
    'results_view': [('branding', 1), ('results_page', 2)],
    'admin_voting_status': [('admin_voting_status_page', 1)],
}

# Throttle limits (per user or per IP — see notes in output)
THROTTLE_PER_MINUTE = {
    'login_submit': 10,   # ScopedUserThrottle on login (anonymous → per IP in DRF)
    'vote_submit': 3,     # per authenticated user
    'user_global': 1000 / 60.0,  # ~16.7 req/min per user
}

# Server throughput assumptions (requests/second, sustained)
SERVER_PROFILES = {
    'dev_runserver': {
        'label': 'Django runserver (dev, 1 process)',
        'light_rps': 8,
        'medium_rps': 4,
        'heavy_rps': 2,
        'write_rps': 3,
    },
    'prod_small': {
        'label': 'Gunicorn 4 workers + SQLite/Postgres (small VPS)',
        'light_rps': 60,
        'medium_rps': 25,
        'heavy_rps': 12,
        'write_rps': 20,
    },
    'prod_tuned': {
        'label': 'Gunicorn 8 workers + Postgres + Redis cache',
        'light_rps': 120,
        'medium_rps': 50,
        'heavy_rps': 25,
        'write_rps': 40,
    },
}

ENDPOINT_WEIGHT = {
    'branding': 'light',
    'login': 'write',
    'dashboard_guest': 'medium',
    'dashboard_auth_extra': 'light',
    'vote_page_load': 'medium',
    'vote_submit': 'write',
    'results_page': 'heavy',
    'my_votes': 'light',
    'admin_voting_status_page': 'medium',
    'admin_profiles_page': 'medium',
}


@dataclass
class ScenarioMix:
    name: str
    description: str
    # fraction of concurrent users per flow (must sum to 1.0)
    flows: Dict[str, float]


SCENARIOS: Dict[str, ScenarioMix] = {
    'login_rush': ScenarioMix(
        name='login_rush',
        description='Morning / poll open: most users logging in at once',
        flows={
            'login_only': 0.70,
            'browse_home': 0.20,
            'vote_already_logged_in': 0.10,
        },
    ),
    'vote_rush': ScenarioMix(
        name='vote_rush',
        description='Peak voting hour: load ballot and submit',
        flows={
            'vote_session': 0.55,
            'vote_already_logged_in': 0.35,
            'browse_home': 0.07,
            'results_view': 0.03,
        },
    ),
    'results_night': ScenarioMix(
        name='results_night',
        description='After polls close: everyone refreshing results',
        flows={
            'results_view': 0.75,
            'browse_home': 0.20,
            'my_votes': 0.05,
        },
    ),
    'mixed_peak': ScenarioMix(
        name='mixed_peak',
        description='Realistic mix during an active election day',
        flows={
            'vote_already_logged_in': 0.40,
            'vote_session': 0.25,
            'browse_home': 0.15,
            'login_only': 0.10,
            'results_view': 0.05,
            'admin_voting_status': 0.05,
        },
    ),
}

# my_votes flow (small)
REQUESTS_PER_FLOW['my_votes'] = [('my_votes', 1)]
REQUESTS_PER_FLOW['admin_voting_status'] = [('admin_voting_status_page', 1)]


def flow_stats(flow_key: str) -> Tuple[int, int]:
    """Return (request_count, response_bytes) for one user completing the flow."""
    total_requests = 0
    total_bytes = 0
    for payload_key, count in REQUESTS_PER_FLOW[flow_key]:
        total_requests += count
        total_bytes += PAYLOAD_BYTES[payload_key] * count
    return total_requests, total_bytes


def scenario_aggregate(
    concurrent_users: int,
    scenario: ScenarioMix,
    burst_seconds: int = 120,
) -> Dict:
    users_by_flow = {
        flow: int(round(concurrent_users * fraction))
        for flow, fraction in scenario.flows.items()
    }
    # Fix rounding drift
    drift = concurrent_users - sum(users_by_flow.values())
    if drift != 0:
        largest_flow = max(scenario.flows, key=scenario.flows.get)
        users_by_flow[largest_flow] += drift

    total_requests = 0
    total_egress_bytes = 0
    weighted_rps_demand = 0.0

    for flow, user_count in users_by_flow.items():
        if user_count <= 0:
            continue
        req_per_user, bytes_per_user = flow_stats(flow)
        total_requests += user_count * req_per_user
        total_egress_bytes += user_count * bytes_per_user

        for payload_key, count in REQUESTS_PER_FLOW[flow]:
            weight = ENDPOINT_WEIGHT[payload_key]
            profile_key = f'{weight}_rps'
            for _ in range(user_count * count):
                weighted_rps_demand += 1.0  # count endpoints; normalize below

    arrival_rps = total_requests / max(burst_seconds, 1)

    return {
        'users_by_flow': users_by_flow,
        'total_requests': total_requests,
        'total_egress_mb': total_egress_bytes / (1024 * 1024),
        'total_ingress_mb': total_egress_bytes * 0.15 / (1024 * 1024),  # rough upload fraction
        'arrival_rps': arrival_rps,
        'burst_seconds': burst_seconds,
    }


def capacity_for_scenario(scenario: ScenarioMix, server_key: str) -> float:
    """Effective sustained RPS capacity for this scenario's request mix."""
    profile = SERVER_PROFILES[server_key]
    weighted = 0.0
    total_weight = 0.0
    for flow, fraction in scenario.flows.items():
        for payload_key, count in REQUESTS_PER_FLOW[flow]:
            weight_class = ENDPOINT_WEIGHT[payload_key]
            rps = profile[f'{weight_class}_rps']
            weighted += fraction * count * rps
            total_weight += fraction * count
    return weighted / total_weight if total_weight else profile['medium_rps']


def throttle_analysis(
    concurrent_users: int,
    scenario: ScenarioMix,
    burst_seconds: int = 120,
) -> List[str]:
    notes = []
    if scenario.name in ('login_rush', 'mixed_peak'):
        # login: 10/min per IP — campus often shares NAT; warn below 100 concurrent same NAT
        agg = scenario_aggregate(concurrent_users, scenario, burst_seconds)
        logins = sum(
            users
            for flow, users in agg['users_by_flow'].items()
            if flow in ('login_only', 'vote_session')
        )
        if logins > 50:
            notes.append(
                f'Login throttle: {THROTTLE_PER_MINUTE["login_submit"]:.0f}/min per IP — '
                f'~{logins} login attempts in burst may hit 429 for users behind the same campus NAT.'
            )

    vote_attempts = 0
    agg = scenario_aggregate(concurrent_users, scenario, burst_seconds)
    for flow, users in agg['users_by_flow'].items():
        if 'vote' in flow:
            vote_attempts += users
    if vote_attempts > 0:
        notes.append(
            f'Vote submit throttle: {THROTTLE_PER_MINUTE["vote_submit"]:.0f}/min per user — '
            'safe for one ballot each; only affects double-click / retry spam.'
        )
    return notes


def utilization_pct(arrival_rps: float, capacity_rps: float) -> float:
    if capacity_rps <= 0:
        return 999.0
    return (arrival_rps / capacity_rps) * 100.0


def predict_experience(util_pct: float) -> str:
    if util_pct < 50:
        return 'Smooth - low queueing'
    if util_pct < 80:
        return 'Good - slight slowdown possible'
    if util_pct < 100:
        return 'Busy - noticeable waits (2-5s on heavy pages)'
    if util_pct < 150:
        return 'Overloaded - queues; timeouts likely on dev server'
    return 'Severe - sustained failures/timeouts without scaling'


def percent_of_total(concurrent: int, total_students: int) -> float:
    if total_students <= 0:
        return 0.0
    return (concurrent / total_students) * 100.0


class Command(BaseCommand):
    help = 'Simulate concurrent student load (requests, bandwidth, server capacity).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--total-students',
            type=int,
            default=2000,
            help='Total enrolled students in sample (default: 2000)',
        )
        parser.add_argument(
            '--concurrent',
            type=str,
            default='25,50,100,200,500,1000,2000',
            help='Comma-separated concurrent user counts to simulate',
        )
        parser.add_argument(
            '--scenario',
            type=str,
            default='all',
            choices=['all', 'login_rush', 'vote_rush', 'results_night', 'mixed_peak'],
            help='Traffic pattern (default: all scenarios)',
        )
        parser.add_argument(
            '--server',
            type=str,
            default='all',
            choices=['all', 'dev_runserver', 'prod_small', 'prod_tuned'],
            help='Server capacity profile',
        )
        parser.add_argument(
            '--burst-seconds',
            type=int,
            default=120,
            help='Seconds over which concurrent users finish their flows (default: 120)',
        )

    def handle(self, *args, **options):
        total_students = options['total_students']
        concurrent_list = [int(x.strip()) for x in options['concurrent'].split(',') if x.strip()]
        scenario_filter = options['scenario']
        server_filter = options['server']
        burst_seconds = options['burst_seconds']

        scenarios = (
            [SCENARIOS[scenario_filter]]
            if scenario_filter != 'all'
            else list(SCENARIOS.values())
        )
        servers = (
            [server_filter]
            if server_filter != 'all'
            else list(SERVER_PROFILES.keys())
        )

        self.stdout.write(self.style.SUCCESS('=' * 72))
        self.stdout.write(self.style.SUCCESS('E-Botar concurrent load simulation'))
        self.stdout.write(self.style.SUCCESS('=' * 72))
        self.stdout.write(
            f'\nSample population: {total_students:,} students\n'
            f'Burst window: {burst_seconds}s (users active at the same time)\n'
            f'Concurrent counts: {", ".join(str(c) for c in concurrent_list)}\n'
        )
        self.stdout.write(
            '\nAssumptions: paginated admin lists (50 rows); vote page uses full candidate '
            'payload; throttles from settings.py (login 10/min/IP, vote 3/min/user).\n'
        )

        for scenario in scenarios:
            self.stdout.write(self.style.WARNING(f'\n--- Scenario: {scenario.name} ---'))
            self.stdout.write(f'{scenario.description}\n')

            header = (
                f'{"Concurrent":>10} | {"% of sample":>10} | {"Requests":>9} | '
                f'{"Egress MB":>10} | {"Req/s":>7}'
            )
            self.stdout.write(header)
            self.stdout.write('-' * len(header))

            for concurrent in concurrent_list:
                if concurrent > total_students:
                    continue
                agg = scenario_aggregate(concurrent, scenario, burst_seconds)
                arrival_rps = agg['total_requests'] / burst_seconds
                pct = percent_of_total(concurrent, total_students)
                self.stdout.write(
                    f'{concurrent:>10,} | {pct:>9.1f}% | {agg["total_requests"]:>9,} | '
                    f'{agg["total_egress_mb"]:>10.1f} | {arrival_rps:>7.1f}'
                )

            for server_key in servers:
                profile = SERVER_PROFILES[server_key]
                cap = capacity_for_scenario(scenario, server_key)
                self.stdout.write(f'\n  Server: {profile["label"]} (~{cap:.0f} req/s capacity for this mix)')
                for concurrent in concurrent_list:
                    if concurrent > total_students:
                        continue
                    agg = scenario_aggregate(concurrent, scenario, burst_seconds)
                    arrival_rps = agg['total_requests'] / burst_seconds
                    util = utilization_pct(arrival_rps, cap)
                    experience = predict_experience(util)
                    self.stdout.write(
                        f'    {concurrent:>6,} users -> util {util:>5.0f}% - {experience}'
                    )

            notes = []
            for concurrent in concurrent_list:
                if concurrent > total_students:
                    continue
                notes.extend(throttle_analysis(concurrent, scenario, burst_seconds))
            if notes:
                self.stdout.write('\n  Throttle / ops notes:')
                for note in dict.fromkeys(notes):
                    self.stdout.write(f'    - {note}')

        self.stdout.write(self.style.SUCCESS('\n' + '=' * 72))
        self.stdout.write(
            '\nSizing reference:\n'
            '  - 2k campus / 200-500 concurrent: current stack + pagination is workable\n'
            '  - 4-8k campus / 2-4k concurrent vote open: needs horizontal scale + caching (see below)\n'
            '  - vote_rush at 4k concurrent ~= 176 req/s and ~1.2 GB JSON egress per 2-min burst\n'
        )
        self.stdout.write(self.style.SUCCESS('=' * 72))
