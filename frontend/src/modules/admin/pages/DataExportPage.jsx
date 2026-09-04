/**
 * DataExportPage
 * Admin page for exporting different types of data (election results, student data)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container } from '../../../components/layout';
import { Card, Button, LoadingSpinner } from '../../../components/common';
import { programService, electionService, votingService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { useBranding } from '../../../hooks/useBranding';
import { formatNumber } from '../../../utils/formatters';
import jsPDF from 'jspdf';
import './studentExport.css';
import '../admin.css';

// Reshape the `/voting/results/breakdown/` response into the
// `studentsByDept` and `votesByCategory` structures the PDF generators
// already understand. The studentsByDept bucket now also carries
// `voted_count` / `not_voted_count` (from the server's student_roster) so
// the Students-tab PDF can render aggregate voting participation without
// ever touching individual user data.
const transformBreakdownToInternalShape = (breakdown, electionType) => {
  const studentsByDept = {};
  for (const row of breakdown?.student_roster || []) {
    const deptName = row.department_name;
    const courseName = row.course_name;
    const yearLevel = row.year_level;

    if (!studentsByDept[deptName]) {
      studentsByDept[deptName] = { code: row.department_code };
    }
    if (!studentsByDept[deptName][courseName]) {
      studentsByDept[deptName][courseName] = {
        code: row.course_code,
        yearLevels: {},
      };
    }
    const total = row.total_count || 0;
    const voted = row.voted_count || 0;
    studentsByDept[deptName][courseName].yearLevels[yearLevel] = {
      count: total,
      voted_count: voted,
      not_voted_count: Math.max(0, total - voted),
    };
  }

  const votesByCategory = {};
  for (const candidate of breakdown?.vote_breakdown || []) {
    const entry = {
      candidate_id: candidate.candidate_id,
      position_name: candidate.position_name,
      departments: {},
    };

    if (electionType === 'department') {
      // Department election: skip the department layer (Course -> Year Level only).
      for (const group of candidate.groups || []) {
        const courseName = group.course_name;
        const yearLevel = group.year_level;
        if (!entry.departments[courseName]) {
          entry.departments[courseName] = {
            code: group.course_code,
            yearLevels: {},
          };
        }
        entry.departments[courseName].yearLevels[yearLevel] = {
          count: group.count || 0,
        };
      }
    } else {
      // University election: Department -> Course -> Year Level.
      for (const group of candidate.groups || []) {
        const deptName = group.department_name;
        const courseName = group.course_name;
        const yearLevel = group.year_level;
        if (!entry.departments[deptName]) {
          entry.departments[deptName] = {
            code: group.department_code,
            courses: {},
          };
        }
        if (!entry.departments[deptName].courses[courseName]) {
          entry.departments[deptName].courses[courseName] = {
            code: group.course_code,
            yearLevels: {},
          };
        }
        entry.departments[deptName].courses[courseName].yearLevels[yearLevel] = {
          count: group.count || 0,
        };
      }
    }

    votesByCategory[candidate.candidate_name] = entry;
  }

  return { studentsByDept, votesByCategory };
};

const DataExportPage = () => {
  const { isStaffOrAdmin } = useAuth();
  const branding = useBranding();
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('results'); // 'results' or 'students'
  
  // Student export state. Aggregated analytics come from the `breakdown`
  // endpoint (counts only). When the operator opts in to "Include student
  // voting status", we additionally fetch a scoped, audit-logged roster
  // (name + section + voted/not-voted) from `student_roster/` — the only
  // path that ever returns individual names in the export flow.
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedElectionForStudents, setSelectedElectionForStudents] = useState('');
  const [electionForStudents, setElectionForStudents] = useState(null);
  const [showStudentNames, setShowStudentNames] = useState(false);
  const [studentRoster, setStudentRoster] = useState(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  
  // Results export state
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [electionResults, setElectionResults] = useState(null);
  const [election, setElection] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentsByDept, setStudentsByDept] = useState({});
  const [categorizeVotes, setCategorizeVotes] = useState(false);
  const [votesByCategory, setVotesByCategory] = useState({});

  useEffect(() => {
    if (!isStaffOrAdmin) {
      return;
    }
    fetchData();
    fetchElections();
  }, [isStaffOrAdmin]);

  useEffect(() => {
    if (selectedDept) {
      fetchCourses(selectedDept);
    } else {
      setCourses([]);
      setSelectedCourse('');
    }
  }, [selectedDept]);

  // Load election details when the Students-tab election dropdown changes.
  // For department elections, lock the dept filter to that election's
  // allowed department. No ballot or profile fetching here — voting
  // analytics come from the breakdown effect below.
  useEffect(() => {
    if (!selectedElectionForStudents) {
      setElectionForStudents(null);
      setSelectedDept('');
      setSelectedCourse('');
      setCourses([]);
      return;
    }
    const fetchElectionForStudents = async () => {
      try {
        const electionResponse = await electionService.getById(selectedElectionForStudents);
        const electionData = electionResponse?.data;
        if (!electionData) {
          return;
        }
        setElectionForStudents(electionData);

        if (electionData.election_type === 'department' && electionData.allowed_department) {
          const allowedDeptCode = typeof electionData.allowed_department === 'object'
            ? electionData.allowed_department.code
            : electionData.allowed_department;
          if (allowedDeptCode) {
            setSelectedDept(String(allowedDeptCode));
            try {
              const coursesResponse = await programService.getCourses(allowedDeptCode);
              setCourses(coursesResponse.data || []);
            } catch (courseError) {
              console.error('Error fetching courses:', courseError);
              setCourses([]);
            }
          }
        } else {
          setSelectedDept('');
          setSelectedCourse('');
          setCourses([]);
        }
      } catch (error) {
        console.error('Error fetching election for student data:', error);
        setElectionForStudents(null);
      }
    };
    fetchElectionForStudents();
  }, [selectedElectionForStudents]);

  // Pull the aggregated breakdown for the Students tab. The server returns
  // counts only — no names, no user IDs, no choices — and is the single
  // source of truth the Students-tab PDF renders from. studentsByDept and
  // votesByCategory are shared with the Results tab; they're intentionally
  // left in place when the user clears the dropdown so cross-tab navigation
  // doesn't wipe loaded data.
  useEffect(() => {
    if (!selectedElectionForStudents || !electionForStudents) {
      return;
    }
    const fetchBreakdownForStudentExport = async () => {
      try {
        const breakdownResponse = await votingService.getResultsBreakdown(selectedElectionForStudents);
        const breakdown = breakdownResponse?.data;
        if (!breakdown) {
          return;
        }
        const { studentsByDept: nextStudentsByDept, votesByCategory: nextVotesByCategory } =
          transformBreakdownToInternalShape(breakdown, electionForStudents.election_type);
        setStudentsByDept(nextStudentsByDept);
        setVotesByCategory(nextVotesByCategory);
      } catch (error) {
        console.error('Error fetching breakdown for student export:', error);
      }
    };
    fetchBreakdownForStudentExport();
  }, [selectedElectionForStudents, electionForStudents]);

  // Lazily fetch the per-student voting-status roster only when the
  // operator explicitly opts in AND has narrowed the scope to one
  // (department, course). The backend audit-logs each call, so we want
  // exactly one fetch per scope change rather than firing on every render.
  useEffect(() => {
    if (!showStudentNames || !selectedElectionForStudents || !selectedDept || !selectedCourse) {
      setStudentRoster(null);
      return undefined;
    }
    let cancelled = false;
    setLoadingRoster(true);
    votingService.getStudentRoster(selectedElectionForStudents, selectedDept, selectedCourse)
      .then((response) => {
        if (!cancelled) setStudentRoster(response?.data || null);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Error fetching student roster:', err);
          setStudentRoster(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRoster(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showStudentNames, selectedElectionForStudents, selectedDept, selectedCourse]);

  // Fetch everything the Results tab needs in parallel. The breakdown
  // endpoint returns pre-aggregated counts (per dept/course/year_level for
  // the roster, per candidate × bucket for vote breakdown), which replaces
  // the previous flow that pulled every profile and ballot into the browser
  // and aggregated by hand.
  const fetchElectionResults = useCallback(async (electionId) => {
    if (!electionId) {
      return;
    }

    try {
      setLoadingResults(true);
      setError(null);

      const [electionResponse, resultsResponse, breakdownResponse] = await Promise.all([
        electionService.getById(electionId),
        votingService.getElectionResults(electionId),
        votingService.getResultsBreakdown(electionId).catch((breakdownError) => {
          console.error('Error fetching breakdown:', breakdownError);
          return null;
        }),
      ]);

      if (!electionResponse?.data) {
        throw new Error('Election not found');
      }
      if (!resultsResponse?.data) {
        throw new Error('Results not available');
      }

      const electionData = electionResponse.data;
      const resultsData = resultsResponse.data;
      const breakdown = breakdownResponse?.data || null;

      setElection(electionData);
      setElectionResults(resultsData.positions || []);
      setStatistics({
        total_voters: resultsData.total_voters || 0,
        total_votes: resultsData.total_ballots || 0,
        total_positions: resultsData.positions?.length || 0,
        turnout_percentage: 0,
      });

      if (breakdown) {
        const { studentsByDept: nextStudentsByDept, votesByCategory: nextVotesByCategory } =
          transformBreakdownToInternalShape(breakdown, electionData.election_type);
        // Keep the original "never report fewer students than ballots" floor.
        setTotalStudents(
          Math.max(breakdown.totals?.eligible_voters || 0, resultsData.total_voters || 0)
        );
        setStudentsByDept(nextStudentsByDept);
        setVotesByCategory(nextVotesByCategory);
      } else {
        setTotalStudents(resultsData.total_voters || 0);
        setStudentsByDept({});
        setVotesByCategory({});
      }
    } catch (error) {
      console.error('Error fetching election results:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      setError(`Failed to load election results: ${errorMessage}`);
      setElectionResults([]);
      setElection(null);
      setStatistics(null);
      setStudentsByDept({});
      setTotalStudents(0);
      setVotesByCategory({});
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchElectionResults(selectedElection);
    } else {
      setElectionResults(null);
      setElection(null);
      setStatistics(null);
      setStudentsByDept({});
      setTotalStudents(0);
      setVotesByCategory({});
      setError(null);
    }
  }, [selectedElection, fetchElectionResults]);

  const fetchData = async () => {
    // Only departments are needed up-front (for the dropdown). Courses are
    // fetched per-department lazily; per-student data is no longer fetched
    // here — analytics come from the breakdown endpoint when an election
    // is selected.
    try {
      setLoading(true);
      const departmentsResponse = await programService.getDepartments().catch(() => ({ data: [] }));
      setDepartments(departmentsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 403) {
        setError('You do not have permission to access this data. Please contact an administrator.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchElections = async () => {
    try {
      const response = await electionService.getAll();
      setElections(response.data || []);
    } catch (error) {
      console.error('Error fetching elections:', error);
    }
  };

  const fetchCourses = async (departmentCodeOrId) => {
    try {
      // If departmentCodeOrId is a number, find the department code first
      let deptCode = departmentCodeOrId;
      if (departmentCodeOrId && !isNaN(departmentCodeOrId) && departments.length > 0) {
        // It might be an ID, try to find the department code
        const dept = departments.find(d => 
          String(d.id) === String(departmentCodeOrId) || 
          d.id === parseInt(departmentCodeOrId)
        );
        if (dept && dept.code) {
          deptCode = dept.code;
        }
        // If no code found, use the value as-is (might be a code that looks like a number)
      }
      const response = await programService.getCourses(deptCode);
      setCourses(response.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    }
  };

  // Apply the (optional) Department / Course dropdowns to the breakdown
  // already in state and produce a filtered studentsByDept-shaped tree.
  // Pure derivation — no fetching, no individual records.
  const filteredStudentsByDept = useMemo(() => {
    if (!selectedDept && !selectedCourse) {
      return studentsByDept;
    }
    const result = {};
    for (const [deptName, deptValue] of Object.entries(studentsByDept)) {
      if (selectedDept && deptValue.code !== selectedDept) {
        continue;
      }
      const filteredCourses = { code: deptValue.code };
      for (const [courseName, courseValue] of Object.entries(deptValue)) {
        if (courseName === 'code') continue;
        if (selectedCourse && courseValue.code !== selectedCourse) {
          continue;
        }
        filteredCourses[courseName] = courseValue;
      }
      // Only include the department if it still has at least one course bucket.
      if (Object.keys(filteredCourses).length > 1) {
        result[deptName] = filteredCourses;
      }
    }
    return result;
  }, [studentsByDept, selectedDept, selectedCourse]);

  const exportElectionResultsToPDF = (mockStudentsData = null, mockTotalStudents = null) => {
    // Prevent React click event from being treated as mockStudentsData
    if (mockStudentsData && typeof mockStudentsData === 'object') {
      const isProbablyReactEvent =
        typeof mockStudentsData.preventDefault === 'function' ||
        typeof mockStudentsData.stopPropagation === 'function' ||
        'nativeEvent' in mockStudentsData;
      if (isProbablyReactEvent) {
        mockStudentsData = null;
        mockTotalStudents = null;
      }
    }

    // If no election is selected and we're using mock data, create a temporary election object
    const electionToUse = election || (mockStudentsData ? { title: 'Mock Election Results', id: 'mock' } : null);
    
    if (!electionToUse) {
      alert('Please select an election first.');
      return;
    }

    // Use mock data if provided, otherwise use state
    const studentsDataToUse = mockStudentsData || studentsByDept;
    const totalStudentsToUse = mockTotalStudents !== null ? mockTotalStudents : totalStudents;

    if (!electionResults || electionResults.length === 0) {
      // Allow export even without election results if we have mock student data
      if (!mockStudentsData) {
        alert('No results available to export. This election may not have any results yet.');
        return;
      }
    }

    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      const checkPageBreak = (requiredHeight) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Header
      doc.setFillColor(11, 110, 59);
      doc.rect(0, 0, pageWidth, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(electionToUse.title || 'Election Results', margin, 25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Election Results Report', margin, 35);
      
      const exportDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.setFontSize(10);
      doc.text(`Exported on: ${exportDate}`, pageWidth - margin, 35, { align: 'right' });

      yPosition = 60;

      // Statistics Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Election Statistics', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const statsY = yPosition;
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.rect(margin, statsY - 5, contentWidth, 25);
      
      doc.text(`Total Students: ${formatNumber(totalStudentsToUse || 0)}`, margin + 5, statsY + 5);
      doc.text(`Votes Recorded: ${formatNumber(statistics?.total_voters || statistics?.total_ballots || 0)}`, margin + 5, statsY + 12);
      
      if (statistics?.total_voters && totalStudentsToUse > 0) {
        const turnout = ((statistics.total_voters / totalStudentsToUse) * 100).toFixed(1);
        doc.text(`Voter Turnout: ${turnout}%`, margin + 5, statsY + 19);
      }

      yPosition += 35;

      // Results by Position (only if we have election results)
      if (electionResults && electionResults.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Results by Position', margin, yPosition);
        yPosition += 10;

        electionResults.forEach((positionResult, index) => {
        checkPageBreak(60);

        // Position Header
        doc.setFillColor(11, 110, 59);
        doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(positionResult.position_name || `Position ${index + 1}`, margin + 3, yPosition);
        
        yPosition += 10;
        doc.setTextColor(0, 0, 0);

        // Table Header
        const tableStartY = yPosition - 5;
        const headerHeight = 7;
        const rowHeight = 7;
        
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, tableStartY, contentWidth, headerHeight, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.rect(margin, tableStartY, contentWidth, headerHeight);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const rankX = margin + 8;
        const nameX = margin + 25;
        const partyX = margin + 95;
        const votesX = margin + 155;
        
        doc.text('Rank', rankX, yPosition);
        doc.text('Candidate Name', nameX, yPosition);
        doc.text('Party', partyX, yPosition);
        doc.text('Votes', votesX, yPosition);
        
        yPosition += headerHeight;
        const tableStartX = margin;

        // Candidates rows
        if (positionResult.candidates && Array.isArray(positionResult.candidates) && positionResult.candidates.length > 0) {
          // Sort candidates by vote count (descending) to ensure proper ranking
          const sortedCandidates = [...positionResult.candidates].sort((a, b) => {
            const votesA = a.vote_count || a.votes || 0;
            const votesB = b.vote_count || b.votes || 0;
            return votesB - votesA;
          });

          sortedCandidates.forEach((candidate, rank) => {
            checkPageBreak(rowHeight + 2);
            
            const voteCount = candidate.vote_count || candidate.votes || 0;
            const isWinner = candidate.is_winner || (rank === 0 && voteCount > 0);
            const rowY = yPosition - 4;
            
            if (isWinner) {
              doc.setFillColor(254, 243, 199);
              doc.rect(tableStartX, rowY, contentWidth, rowHeight, 'F');
            }
            
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.3);
            doc.rect(tableStartX, rowY, contentWidth, rowHeight);

            doc.setFontSize(9);
            doc.setFont('helvetica', isWinner ? 'bold' : 'normal');
            doc.text(`${rank + 1}`, rankX, yPosition);
            
            const candidateName = candidate.candidate_name || candidate.name || 'Unknown';
            doc.text(candidateName, nameX, yPosition, { maxWidth: partyX - nameX - 8 });
            
            const partyName = candidate.party || candidate.party_name || 'Independent';
            doc.text(partyName, partyX, yPosition, { maxWidth: votesX - partyX - 8 });
            
            const voteText = formatNumber(voteCount);
            doc.text(voteText, votesX, yPosition);
            
            yPosition += rowHeight;
          });
          
          const tableEndY = yPosition - rowHeight;
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.line(tableStartX, tableEndY + rowHeight, tableStartX + contentWidth, tableEndY + rowHeight);
        } else {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(107, 114, 128);
          doc.text('No candidates for this position', margin + 5, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += rowHeight;
        }

        yPosition += 5;
        });
      } else if (mockStudentsData) {
        // If no election results but we have mock data, skip to student statistics
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(107, 114, 128);
        doc.text('Note: This is a mock data export for testing purposes.', margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 10;
      }

      // Add Vote Counts by Category if enabled
      // Structure: Candidate → Department → Course → Year Level
      const votesToUse = votesByCategory;
      if (categorizeVotes && votesToUse && Object.keys(votesToUse).length > 0) {
        doc.addPage();
        yPosition = margin;
        
        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(11, 110, 59);
        doc.text(
          'Vote Counts by Position (College and Course Breakdown)',
          pageWidth / 2,
          yPosition,
          { align: 'center' }
        );
        
        yPosition += 15;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(
          `Election: ${electionToUse.title || 'N/A'}`,
          pageWidth / 2,
          yPosition,
          { align: 'center' }
        );
        
        yPosition += 10;
        doc.setTextColor(0, 0, 0);
        
        const calculateCourseTotalVotes = (courseData) => {
          if (!courseData || !courseData.yearLevels) return 0;
          return Object.values(courseData.yearLevels).reduce((sum, yl) => sum + (yl.count || 0), 0);
        };

        const calculateDepartmentTotalVotes = (deptData) => {
          if (!deptData || !deptData.courses) return 0;
          return Object.values(deptData.courses).reduce(
            (sum, courseData) => sum + calculateCourseTotalVotes(courseData),
            0
          );
        };

        const calculateCandidateTotalVotes = (candidateData) => {
          if (!candidateData || !candidateData.departments) return 0;
          if (electionToUse.election_type === 'department') {
            return Object.values(candidateData.departments).reduce(
              (sum, courseData) => sum + calculateCourseTotalVotes(courseData),
              0
            );
          }
          return Object.values(candidateData.departments).reduce(
            (sum, deptData) => sum + calculateDepartmentTotalVotes(deptData),
            0
          );
        };

        const positionsMap = {};
        Object.keys(votesToUse).forEach((candidateName) => {
          const candidateData = votesToUse[candidateName];
          if (!candidateData || !candidateData.departments) return;
          const positionName = candidateData.position_name || 'Unknown Position';
          if (!positionsMap[positionName]) positionsMap[positionName] = [];
          positionsMap[positionName].push({
            candidateName,
            candidateData,
            totalVotes: calculateCandidateTotalVotes(candidateData),
          });
        });

        Object.keys(positionsMap).sort().forEach((positionName) => {
          const positionCandidates = positionsMap[positionName] || [];
          if (!positionCandidates.length) return;

          checkPageBreak(60);

          doc.setFillColor(11, 110, 59);
          doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.text(positionName, margin + 5, yPosition);

          yPosition += 12;
          doc.setTextColor(0, 0, 0);

          const sortedCandidates = [...positionCandidates].sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));

          sortedCandidates.forEach(({ candidateName, candidateData, totalVotes }) => {
            checkPageBreak(45);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${candidateName} - Total Votes: ${formatNumber(totalVotes || 0)}`, margin + 2, yPosition);

            yPosition += 8;

            if (electionToUse.election_type === 'department') {
              // Department election: Course breakdown
              Object.keys(candidateData.departments)
                .filter((key) => candidateData.departments[key] && typeof candidateData.departments[key] === 'object' && candidateData.departments[key].yearLevels)
                .sort()
                .forEach((courseName) => {
                  const courseData = candidateData.departments[courseName];
                  const courseTotalVotes = calculateCourseTotalVotes(courseData);
                  checkPageBreak(20);
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.text(
                    `- ${courseName} (${courseData.code || 'N/A'}): ${formatNumber(courseTotalVotes)} vote${courseTotalVotes !== 1 ? 's' : ''}`,
                    margin + 6,
                    yPosition
                  );
                  yPosition += 6;
                });
            } else {
              // University election: College totals, then courses within college
              Object.keys(candidateData.departments)
                .filter((key) => candidateData.departments[key] && typeof candidateData.departments[key] === 'object')
                .sort()
                .forEach((deptName) => {
                  const deptData = candidateData.departments[deptName];
                  if (!deptData || !deptData.courses) return;

                  const deptTotalVotes = calculateDepartmentTotalVotes(deptData);
                  checkPageBreak(28);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'bold');
                  doc.text(
                    `- ${deptName} (${deptData.code || 'N/A'}) - Total: ${formatNumber(deptTotalVotes)}`,
                    margin + 6,
                    yPosition
                  );

                  yPosition += 6;

                  Object.keys(deptData.courses)
                    .filter((key) => deptData.courses[key] && typeof deptData.courses[key] === 'object' && deptData.courses[key].yearLevels)
                    .sort()
                    .forEach((courseName) => {
                      const courseData = deptData.courses[courseName];
                      const courseTotalVotes = calculateCourseTotalVotes(courseData);
                      checkPageBreak(15);
                      doc.setFontSize(9);
                      doc.setFont('helvetica', 'normal');
                      doc.text(
                        `• ${courseName} (${courseData.code || 'N/A'}): ${formatNumber(courseTotalVotes)}`,
                        margin + 12,
                        yPosition
                      );
                      yPosition += 5;
                    });

                  yPosition += 3;
                });
            }

            yPosition += 6;
          });

          yPosition += 6;
        });
      }

      // Add Student Statistics by College/Course on new page
      // Show blank template if no data available
      doc.addPage();
      yPosition = margin;
        
      doc.setFillColor(11, 110, 59);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Statistics by College', pageWidth / 2, 25, { align: 'center' });
      
      yPosition = 50;
      doc.setTextColor(0, 0, 0);
      
      // If no data, show blank template message
      if (!studentsDataToUse || Object.keys(studentsDataToUse).length === 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text('No student data available.', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;
        doc.setFontSize(10);
        doc.text('Please add departments and courses in Program Management to generate data.', pageWidth / 2, yPosition, { align: 'center' });
      } else {
        Object.keys(studentsDataToUse).sort().forEach(deptName => {
          checkPageBreak(40);
          
          doc.setFillColor(11, 110, 59);
          doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          const deptCode = studentsDataToUse[deptName]?.code || 'N/A';
          doc.text(`${deptName} (${deptCode})`, margin + 3, yPosition);
          
          yPosition += 10;
          doc.setTextColor(0, 0, 0);
          
          const courses = studentsDataToUse[deptName];
          if (courses && typeof courses === 'object') {
            Object.keys(courses).filter(key => key !== 'code').sort().forEach(courseName => {
              checkPageBreak(50);
              
              const courseData = courses[courseName];
              if (!courseData) {
                return;
              }
              
              // Check if using new structure (yearLevels) or old structure (students array)
              const hasYearLevels = courseData.yearLevels && typeof courseData.yearLevels === 'object';
              const hasStudents = courseData.students && Array.isArray(courseData.students);
              
              if (!hasYearLevels && !hasStudents) {
                return;
              }
              
              // Calculate total students
              let totalStudents = 0;
              if (hasYearLevels) {
                totalStudents = Object.values(courseData.yearLevels).reduce((sum, yl) => sum + (yl.count || yl.students?.length || 0), 0);
              } else {
                totalStudents = courseData.students.length;
              }
              
              // Course subheader with total count
              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.text(`${courseName} (${courseData.code || 'N/A'}) - Total: ${totalStudents}`, margin + 5, yPosition);
              
              yPosition += 8;

              if (hasYearLevels) {
                // New structure: Group by year level - show only counts
                const yearLevelKeys = Object.keys(courseData.yearLevels).sort();
                yearLevelKeys.forEach(yearLevel => {
                  checkPageBreak(15);
                  
                  const yearLevelData = courseData.yearLevels[yearLevel];
                  const yearLevelCount = yearLevelData.count || yearLevelData.students?.length || 0;
                  
                  // Year level subheader with count only
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setFillColor(243, 244, 246);
                  doc.rect(margin + 10, yPosition - 4, contentWidth - 20, 6, 'F');
                  doc.setTextColor(0, 0, 0);
                  doc.text(`${yearLevel}: ${yearLevelCount} student${yearLevelCount !== 1 ? 's' : ''}`, margin + 15, yPosition);
                  
                  yPosition += 8;
                });
              } else {
                // Old structure: Just show total count
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setFillColor(243, 244, 246);
                doc.rect(margin + 10, yPosition - 4, contentWidth - 20, 6, 'F');
                doc.setTextColor(0, 0, 0);
                doc.text(`Total: ${totalStudents} student${totalStudents !== 1 ? 's' : ''}`, margin + 15, yPosition);
                yPosition += 8;
              }
              
              yPosition += 5; // Space between courses
            });
          }
          
          yPosition += 5; // Space between departments
        });
      }
      
      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(
          `${branding.institution_full_name} - ${branding.app_name} System`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      const fileName = `Election_Results_${electionToUse.title?.replace(/[^a-z0-9]/gi, '_') || electionToUse.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('PDF export error:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      console.error('Error details:', errorMessage);
      alert(`Failed to export PDF: ${errorMessage}. Please check the browser console (F12) for more details.`);
    } finally {
      setExporting(false);
    }
  };

  const exportStudentDataToPDF = () => {
    if (!selectedElectionForStudents) {
      alert('Please select an election first to export student data.');
      return;
    }
    if (typeof jsPDF === 'undefined' || !jsPDF) {
      alert('PDF library not loaded. Please refresh the page and try again.');
      return;
    }

    const studentsDataToUse = filteredStudentsByDept;

    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      const checkPageBreak = (requiredHeight) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Header
      doc.setFillColor(11, 110, 59);
      doc.rect(0, 0, pageWidth, electionForStudents ? 60 : 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Data Export', pageWidth / 2, 25, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      if (electionForStudents) {
        doc.text(`Election: ${electionForStudents.title || 'N/A'}`, pageWidth / 2, 35, { align: 'center' });
        if (electionForStudents.election_type === 'department' && electionForStudents.allowed_department) {
          const deptName = typeof electionForStudents.allowed_department === 'object'
            ? electionForStudents.allowed_department.name
            : 'College Election';
          doc.setFontSize(10);
          doc.text(`College: ${deptName}`, pageWidth / 2, 45, { align: 'center' });
        }
      }

      const exportDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.setFontSize(10);
      doc.text(`Exported on: ${exportDate}`, pageWidth / 2, electionForStudents ? 52 : 35, { align: 'center' });

      yPosition = electionForStudents ? 65 : 55;

      // Aggregated student data by department / course / year level. Each
      // year-level bucket renders count, voted, and not-voted — all derived
      // from the server's breakdown response. No individual names or IDs.
      if (!studentsDataToUse || Object.keys(studentsDataToUse).length === 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text('No student data available.', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;
        doc.setFontSize(10);
        doc.text('Please add departments and courses in Program Management to generate data.', pageWidth / 2, yPosition, { align: 'center' });
      } else {
        Object.keys(studentsDataToUse).sort().forEach((deptName) => {
          checkPageBreak(50);

          doc.setFillColor(11, 110, 59);
          doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          const deptCode = studentsDataToUse[deptName]?.code || 'N/A';
          doc.text(`${deptName} (${deptCode})`, margin + 3, yPosition);

          yPosition += 12;
          doc.setTextColor(0, 0, 0);

          const courses = studentsDataToUse[deptName];
          Object.keys(courses).filter((key) => key !== 'code').sort().forEach((courseName) => {
            checkPageBreak(40);

            const courseData = courses[courseName];
            if (!courseData?.yearLevels || typeof courseData.yearLevels !== 'object') {
              return;
            }

            const courseTotals = Object.values(courseData.yearLevels).reduce(
              (acc, yl) => ({
                total: acc.total + (yl.count || 0),
                voted: acc.voted + (yl.voted_count || 0),
              }),
              { total: 0, voted: 0 }
            );

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(
              `${courseName} (${courseData.code || 'N/A'}) — Total: ${courseTotals.total}, Voted: ${courseTotals.voted}, Not voted: ${Math.max(0, courseTotals.total - courseTotals.voted)}`,
              margin + 5,
              yPosition
            );
            yPosition += 8;

            Object.keys(courseData.yearLevels).sort().forEach((yearLevel) => {
              checkPageBreak(15);

              const yearLevelData = courseData.yearLevels[yearLevel];
              const total = yearLevelData.count || 0;
              const voted = yearLevelData.voted_count || 0;
              const notVoted = yearLevelData.not_voted_count != null
                ? yearLevelData.not_voted_count
                : Math.max(0, total - voted);

              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              doc.setFillColor(243, 244, 246);
              doc.rect(margin + 10, yPosition - 4, contentWidth - 20, 6, 'F');
              doc.setTextColor(0, 0, 0);
              doc.text(
                `${yearLevel}: ${total} student${total !== 1 ? 's' : ''} — ${voted} voted, ${notVoted} not voted`,
                margin + 15,
                yPosition
              );

              yPosition += 8;
            });

            yPosition += 5;
          });

          yPosition += 5;
        });
      }

      // Per-student voting-status pages — rendered only when the operator
      // explicitly opts in and a course-scoped roster has been fetched.
      // Each (year level) gets its own header + table (Name / Section /
      // Vote Status) at a smaller font so more rows fit per page.
      if (showStudentNames && studentRoster?.students?.length > 0) {
        doc.addPage();
        yPosition = margin;

        doc.setFillColor(11, 110, 59);
        doc.rect(0, 0, pageWidth, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const courseTitle = `${studentRoster.course?.name || 'Course'} (${studentRoster.course?.code || ''})`;
        doc.text(courseTitle, pageWidth / 2, 17, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        yPosition = 38;

        const studentsByYear = studentRoster.students.reduce((acc, student) => {
          const key = student.year_level || 'Unspecified';
          (acc[key] = acc[key] || []).push(student);
          return acc;
        }, {});

        const ordinalRank = (label) => {
          if (!label) return 99;
          const lower = String(label).toLowerCase();
          const fromOrdinal = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5 }[lower];
          if (fromOrdinal != null) return fromOrdinal;
          const match = lower.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 99;
        };

        const formatYearLabel = (raw) => {
          if (!raw) return 'Unspecified Year';
          if (/\d+(st|nd|rd|th)/i.test(raw)) return `${raw} Year`;
          const num = parseInt(raw, 10);
          if (!isNaN(num)) {
            const lastTwo = num % 100;
            const suffix = (lastTwo >= 11 && lastTwo <= 13) ? 'th'
              : num % 10 === 1 ? 'st'
              : num % 10 === 2 ? 'nd'
              : num % 10 === 3 ? 'rd'
              : 'th';
            return `${num}${suffix} Year`;
          }
          return raw;
        };

        const sortedYears = Object.keys(studentsByYear).sort(
          (a, b) => ordinalRank(b) - ordinalRank(a),
        );

        const nameColW = contentWidth * 0.55;
        const sectionColW = contentWidth * 0.20;
        const headerH = 6;
        const rowH = 5;

        sortedYears.forEach((yearKey) => {
          checkPageBreak(headerH + rowH * 4 + 10);

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(11, 110, 59);
          doc.text(formatYearLabel(yearKey), margin, yPosition);
          yPosition += 5;
          doc.setTextColor(0, 0, 0);

          doc.setFillColor(11, 110, 59);
          doc.rect(margin, yPosition - 4, contentWidth, headerH, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Name', margin + 2, yPosition);
          doc.text('Section', margin + nameColW + 2, yPosition);
          doc.text('Vote Status', margin + nameColW + sectionColW + 2, yPosition);
          yPosition += headerH;

          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          studentsByYear[yearKey].forEach((student, idx) => {
            checkPageBreak(rowH);
            if (idx % 2 === 0) {
              doc.setFillColor(249, 250, 251);
              doc.rect(margin, yPosition - 3, contentWidth, rowH, 'F');
            }
            doc.setTextColor(0, 0, 0);
            doc.text(student.full_name || '', margin + 2, yPosition);
            doc.text(student.section || '', margin + nameColW + 2, yPosition);
            doc.setFont('helvetica', 'bold');
            if (student.has_voted) {
              doc.setTextColor(22, 163, 74);
              doc.text('Voted', margin + nameColW + sectionColW + 2, yPosition);
            } else {
              doc.setTextColor(220, 38, 38);
              doc.text('Not Voted', margin + nameColW + sectionColW + 2, yPosition);
            }
            doc.setFont('helvetica', 'normal');
            yPosition += rowH;
          });

          yPosition += 4;
        });
      }

      // Add Vote Categorization by Candidate if election is selected and we have vote data
      if (electionForStudents && votesByCategory && Object.keys(votesByCategory).length > 0) {
        doc.addPage();
        yPosition = margin;
        
        // Title
        doc.setFillColor(11, 110, 59);
        doc.rect(0, 0, pageWidth, 50, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(
          'Vote Counts by Candidate, College, Course, and Year Level',
          pageWidth / 2,
          25,
          { align: 'center' }
        );
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Election: ${electionForStudents.title || 'N/A'}`,
          pageWidth / 2,
          35,
          { align: 'center' }
        );
        
        yPosition = 60;
        doc.setTextColor(0, 0, 0);
        
        // Iterate through candidates
        Object.keys(votesByCategory).sort().forEach(candidateName => {
          const candidateData = votesByCategory[candidateName];
          if (!candidateData || !candidateData.departments) return;
          
          const positionName = candidateData.position_name || 'Unknown Position';
          
          checkPageBreak(60);
          
          // Candidate header
          doc.setFillColor(11, 110, 59);
          doc.rect(margin, yPosition - 5, contentWidth, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(`${candidateName}`, margin + 5, yPosition + 2);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Position: ${positionName}`, margin + 5, yPosition + 8);
          
          yPosition += 12;
          doc.setTextColor(0, 0, 0);
          
          if (electionForStudents.election_type === 'department') {
            // Department election: Course → Year Level (no department grouping)
            Object.keys(candidateData.departments)
              .filter(key => candidateData.departments[key] && typeof candidateData.departments[key] === 'object' && candidateData.departments[key].yearLevels)
              .sort()
              .forEach(courseName => {
                const courseData = candidateData.departments[courseName];
                if (!courseData || !courseData.yearLevels) return;
                
                checkPageBreak(40);
                
                // Course header
                doc.setFillColor(16, 185, 129);
                doc.rect(margin + 5, yPosition - 5, contentWidth - 10, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                const totalCourseVotes = Object.values(courseData.yearLevels).reduce((sum, yl) => sum + (yl.count || 0), 0);
                doc.text(`${courseName} (${courseData.code || 'N/A'}) - Total: ${totalCourseVotes}`, margin + 10, yPosition);
                
                yPosition += 10;
                doc.setTextColor(0, 0, 0);
                
                // Year levels
                Object.keys(courseData.yearLevels).sort().forEach(yearLevel => {
                  checkPageBreak(15);
                  const yearLevelData = courseData.yearLevels[yearLevel];
                  const voteCount = yearLevelData.count || 0;
                  
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setFillColor(243, 244, 246);
                  doc.rect(margin + 15, yPosition - 4, contentWidth - 30, 6, 'F');
                  doc.text(`Year ${yearLevel}: ${voteCount} vote${voteCount !== 1 ? 's' : ''}`, margin + 20, yPosition);
                  
                  yPosition += 8;
                });
                
                yPosition += 5; // Space between courses
              });
          } else {
            // University election: Department → Course → Year Level
            Object.keys(candidateData.departments)
              .filter(key => candidateData.departments[key] && typeof candidateData.departments[key] === 'object')
              .sort()
              .forEach(deptName => {
                const deptData = candidateData.departments[deptName];
                if (!deptData || !deptData.courses) return;
                
                checkPageBreak(50);
                
                // Department header
                doc.setFillColor(16, 185, 129);
                doc.rect(margin + 5, yPosition - 5, contentWidth - 10, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                const deptCode = deptData.code || 'N/A';
                doc.text(`${deptName} (${deptCode})`, margin + 10, yPosition);
                
                yPosition += 10;
                doc.setTextColor(0, 0, 0);
                
                // Courses
                Object.keys(deptData.courses)
                  .filter(key => deptData.courses[key] && typeof deptData.courses[key] === 'object' && deptData.courses[key].yearLevels)
                  .sort()
                  .forEach(courseName => {
                    const courseData = deptData.courses[courseName];
                    if (!courseData || !courseData.yearLevels) return;
                    
                    checkPageBreak(40);
                    
                    // Course subheader
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    const totalCourseVotes = Object.values(courseData.yearLevels).reduce((sum, yl) => sum + (yl.count || 0), 0);
                    doc.text(`${courseName} (${courseData.code || 'N/A'}) - Total: ${totalCourseVotes}`, margin + 15, yPosition);
                    
                    yPosition += 8;
                    
                    // Year levels
                    Object.keys(courseData.yearLevels).sort().forEach(yearLevel => {
                      checkPageBreak(15);
                      const yearLevelData = courseData.yearLevels[yearLevel];
                      const voteCount = yearLevelData.count || 0;
                      
                      doc.setFontSize(9);
                      doc.setFont('helvetica', 'normal');
                      doc.setFillColor(243, 244, 246);
                      doc.rect(margin + 20, yPosition - 4, contentWidth - 40, 6, 'F');
                      doc.text(`Year ${yearLevel}: ${voteCount} vote${voteCount !== 1 ? 's' : ''}`, margin + 25, yPosition);
                      
                      yPosition += 8;
                    });
                    
                    yPosition += 5; // Space between courses
                  });
                
                yPosition += 5; // Space between departments
              });
          }
          
          yPosition += 10; // Space between candidates
        });
      }
      
      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(
          `${branding.institution_full_name} - ${branding.app_name} System`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      const fileName = `Student_Export_${electionForStudents?.title?.replace(/[^a-z0-9]/gi, '_') || 'Student_Data'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('PDF export error:', error);
      alert(`Failed to export PDF: ${error?.message || 'Unknown error'}. Please check the browser console (F12) for details.`);
    } finally {
      setExporting(false);
    }
  };

  if (!isStaffOrAdmin) {
    return (
      <Container>
        <div className="admin-export-access-denied">
          <h2>Access Denied</h2>
          <p>You must be staff or an administrator to access this page.</p>
        </div>
      </Container>
    );
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading data..." />;
  }

  const totalStudentsCount = Object.values(filteredStudentsByDept).reduce((total, courses) => {
    return total + Object.entries(courses).reduce((sum, [key, course]) => {
      if (key === 'code') return sum;
      if (course.yearLevels && typeof course.yearLevels === 'object') {
        return sum + Object.values(course.yearLevels).reduce((ylSum, yl) => ylSum + (yl.count || 0), 0);
      }
      return sum;
    }, 0);
  }, 0);

  return (
    <div className="student-export-page">
      <Container>
        <div className="admin-export-header">
          <h1 className="admin-export-title">
            Data Export
          </h1>
          <p className="admin-export-subtitle">
            Export election results and student data in PDF format
          </p>
        </div>

        {/* Tabs */}
        <div className="admin-export-tabs">
          <button
            onClick={() => setActiveTab('results')}
            className={`admin-export-tab ${activeTab === 'results' ? 'admin-export-tab-active' : 'admin-export-tab-inactive'}`}
          >
            Election Results
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`admin-export-tab ${activeTab === 'students' ? 'admin-export-tab-active' : 'admin-export-tab-inactive'}`}
          >
            Student Data
          </button>
        </div>

        {/* Election Results Tab */}
        {activeTab === 'results' && (
          <Card>
            <div className="admin-export-card-content">
              <h2 className="admin-export-section-title">
                Export Election Results
              </h2>
              
              <div className="admin-export-form-group">
                <label className="admin-export-label">
                  Select Election
                </label>
                <select
                  value={selectedElection}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedElection(value);
                    if (!value) {
                      setElectionResults(null);
                      setElection(null);
                      setStatistics(null);
                      setStudentsByDept({});
                    }
                  }}
                  disabled={loadingResults}
                  className="admin-export-select"
                >
                  <option value="">Select an election...</option>
                  {elections.map(elec => (
                    <option key={elec.id} value={String(elec.id)}>
                      {elec.title}
                    </option>
                  ))}
                </select>
                {loadingResults && (
                  <div className="admin-export-loading">
                    <svg className="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Loading election results...
                  </div>
                )}
                {electionResults && (
                  <div className="admin-export-info-box">
                    <label className="admin-export-checkbox-label">
                      <input
                        type="checkbox"
                        checked={categorizeVotes}
                        onChange={(e) => setCategorizeVotes(e.target.checked)}
                        className="admin-export-checkbox"
                      />
                      <span className="admin-export-checkbox-text">
                        Categorize vote counts by {election?.election_type === 'department' ? 'course and year level' : 'department, course, and year level'}
                      </span>
                    </label>
                    {election?.election_type === 'department' && (
                      <div className="admin-export-checkbox-note">
                        Note: For college elections, votes will be categorized by course and year level only.
                      </div>
                    )}
                  </div>
                )}
                {error && (
                  <div className="admin-export-error">
                    {error}
                    <button
                      onClick={() => setError(null)}
                      className="admin-export-error-dismiss"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              {electionResults && (
                <div className="admin-export-stats-box">
                  <div>
                    <div className="admin-export-stats-label">
                      Election Statistics
                    </div>
                    <div className="admin-export-stats-value">
                      {formatNumber(statistics?.total_voters || 0)} votes • {electionResults.length} positions
                    </div>
                    {Object.keys(studentsByDept).length > 0 && (
                      <div className="admin-export-stats-note">
                        {Object.values(studentsByDept).reduce((total, courses) => {
                          return total + Object.values(courses).reduce((sum, course) => {
                            // Handle both new structure (yearLevels) and old structure (students)
                            if (course.yearLevels && typeof course.yearLevels === 'object') {
                              return sum + Object.values(course.yearLevels).reduce((ylSum, yl) => ylSum + (yl.count || yl.students?.length || 0), 0);
                            } else if (course.students && Array.isArray(course.students)) {
                              return sum + course.students.length;
                            }
                            return sum;
                          }, 0);
                        }, 0)} students loaded
                      </div>
                    )}
                  </div>
                  <div className="admin-export-actions">
                    <Button
                      onClick={() => exportElectionResultsToPDF()}
                      disabled={exporting || !electionResults}
                      className="admin-btn-export"
                    >
                      {exporting ? 'Generating PDF...' : 'Export Results PDF'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Student Data Tab */}
        {activeTab === 'students' && (
          <Card>
            <div className="admin-export-card-content">
              <h2 className="admin-export-section-title">
                Export Student Data
              </h2>
              
              <div className="admin-export-form-group">
                <label className="admin-export-label">
                  Select Election (Required)
                </label>
                <select
                  value={selectedElectionForStudents}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedElectionForStudents(value);
                    if (!value) {
                      setElectionForStudents(null);
                    }
                  }}
                  className="admin-export-select"
                >
                  <option value="">Select an election...</option>
                  {elections.map(elec => (
                    <option key={elec.id} value={String(elec.id)}>
                      {elec.title}
                    </option>
                  ))}
                </select>
                {electionForStudents && (
                  <div className="admin-export-checkbox-note" style={{ marginTop: '0.5rem', marginLeft: 0 }}>
                    {electionForStudents.election_type === 'department' 
                      ? `College Election: ${typeof electionForStudents.allowed_department === 'object' ? electionForStudents.allowed_department.name : 'Selected College'}`
                      : 'University Election: All Students'}
                  </div>
                )}
              </div>
              
              <div className="admin-export-grid">
                <div>
                  <label className="admin-export-label">
                    Colleges
                    {electionForStudents?.election_type === 'department' && (
                      <span className="admin-export-label-note">
                        (Locked by Election)
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    disabled={electionForStudents?.election_type === 'department'}
                    className={`admin-export-select ${electionForStudents?.election_type === 'department' ? 'admin-export-select-locked' : ''}`}
                  >
                    <option value="">All Colleges</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.code || String(dept.id)}>
                        {dept.name} {dept.code ? `(${dept.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="admin-export-label">
                    Course
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    disabled={!selectedDept}
                    className="admin-export-select"
                  >
                    <option value="">All Courses</option>
                    {courses.map(course => (
                      <option key={course.code} value={course.code}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional: include per-student voting status. Requires a
                  specific (department, course) so the scope is narrow and
                  every fetch is audit-logged on the server. */}
              {selectedElectionForStudents && (
                <div className="admin-export-option-box">
                  <label className="admin-export-checkbox-label">
                    <input
                      type="checkbox"
                      checked={showStudentNames}
                      onChange={(e) => setShowStudentNames(e.target.checked)}
                      disabled={!selectedDept || !selectedCourse}
                      className="admin-export-checkbox"
                    />
                    <span className="admin-export-checkbox-text">
                      Include student voting status (Name / Section / Voted)
                    </span>
                  </label>
                  <div className="admin-export-option-note">
                    {(!selectedDept || !selectedCourse) ? (
                      <div className="admin-export-option-warning">
                        Select a specific College and Course above to enable this option. Names are only available for one course at a time.
                      </div>
                    ) : showStudentNames ? (
                      <div className="admin-export-option-warning">
                        Adds a per-year-level table (Name, Section, Vote Status) to the exported PDF. Each access is recorded in the system activity log.
                        {loadingRoster && ' Loading roster…'}
                        {studentRoster && !loadingRoster && ` ${studentRoster.students?.length || 0} student(s) loaded.`}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="admin-export-stats-box">
                <div>
                  <div className="admin-export-stats-label">
                    Total Students
                  </div>
                  <div className="admin-export-stats-value-large">
                    {totalStudentsCount}
                  </div>
                </div>
                <div className="admin-export-actions">
                  <Button
                    onClick={() => {
                      if (!selectedElectionForStudents) {
                        alert('Please select an election first.');
                        return;
                      }
                      if (showStudentNames && (!selectedDept || !selectedCourse)) {
                        alert('Including student names requires selecting both a College and a Course.');
                        return;
                      }
                      if (totalStudentsCount === 0) {
                        const confirmExport = confirm('No students match the current filters. Do you want to export an empty template?');
                        if (!confirmExport) {
                          return;
                        }
                      }
                      exportStudentDataToPDF();
                    }}
                    disabled={exporting || !selectedElectionForStudents || loadingRoster}
                    className="admin-btn-export"
                  >
                    {exporting ? 'Generating PDF...' : loadingRoster ? 'Loading roster…' : 'Export to PDF'}
                  </Button>
                </div>
              </div>

              {/* Preview — aggregated counts only, no individual data. */}
              {Object.keys(filteredStudentsByDept).length > 0 && (
                <div>
                  <h3 className="admin-export-preview-title">
                    Preview
                  </h3>
                  <div className="admin-export-preview-container">
                    {Object.keys(filteredStudentsByDept).sort().map(deptName => (
                      <div key={deptName} className="admin-export-preview-dept">
                        <div className="admin-export-preview-dept-header">
                          {deptName}
                        </div>
                        {Object.keys(filteredStudentsByDept[deptName])
                          .filter(key => key !== 'code')
                          .sort()
                          .map(courseName => {
                            const courseData = filteredStudentsByDept[deptName][courseName];
                            const yearLevels = courseData.yearLevels || {};
                            const courseTotal = Object.values(yearLevels).reduce((sum, yl) => sum + (yl.count || 0), 0);
                            const courseVoted = Object.values(yearLevels).reduce((sum, yl) => sum + (yl.voted_count || 0), 0);
                            return (
                              <div key={courseName} className="admin-export-preview-course">
                                <div className="admin-export-preview-course-title">
                                  {courseName} ({courseData.code || 'N/A'}) — {courseTotal} student{courseTotal !== 1 ? 's' : ''}, {courseVoted} voted
                                </div>
                                <div className="admin-export-preview-course-info">
                                  {Object.keys(yearLevels).sort().map(yearLevel => {
                                    const yl = yearLevels[yearLevel];
                                    const count = yl.count || 0;
                                    const voted = yl.voted_count || 0;
                                    const notVoted = yl.not_voted_count != null ? yl.not_voted_count : Math.max(0, count - voted);
                                    return (
                                      <div key={yearLevel} className="admin-export-preview-year-level">
                                        {yearLevel}: {count} student{count !== 1 ? 's' : ''} — {voted} voted, {notVoted} not voted
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default DataExportPage;

