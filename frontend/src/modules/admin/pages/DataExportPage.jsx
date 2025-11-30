/**
 * DataExportPage
 * Admin page for exporting different types of data (election results, student data)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container } from '../../../components/layout';
import { Card, Button, LoadingSpinner } from '../../../components/common';
import { authService, programService, electionService, votingService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { formatNumber } from '../../../utils/formatters';
import jsPDF from 'jspdf';
import './studentExport.css';

const DataExportPage = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('results'); // 'results' or 'students'
  
  // Student export state
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState({});
  
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
  const [mockVotesByCategory, setMockVotesByCategory] = useState(null); // For frontend-only mock votes

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    fetchData();
    fetchElections();
  }, [isAdmin]);

  useEffect(() => {
    if (selectedDept) {
      fetchCourses(selectedDept);
    } else {
      setCourses([]);
      setSelectedCourse('');
    }
  }, [selectedDept]);

  useEffect(() => {
    filterStudents();
  }, [selectedDept, selectedCourse, students]);

  // Fetch votes by category function (defined before fetchElectionResults)
  const fetchVotesByCategory = useCallback(async (electionId, electionData, allProfiles) => {
    try {
      // If we have mock votes (frontend-only), use those instead of fetching from database
      if (mockVotesByCategory !== null) {
        setVotesByCategory(mockVotesByCategory);
        return;
      }
      
      // Get all ballots for this election (admin only)
      const ballotsResponse = await votingService.getMyBallots();
      const allBallots = ballotsResponse.data || [];
      
      // Filter ballots for this election
      const electionBallots = allBallots.filter(ballot => {
        const ballotElectionId = ballot.election?.id || ballot.election;
        return ballotElectionId === parseInt(electionId) || ballotElectionId === electionId;
      });
      
      // Get user IDs who voted
      const voterUserIds = new Set();
      electionBallots.forEach(ballot => {
        const userId = ballot.user?.id || ballot.user;
        if (userId) {
          voterUserIds.add(userId);
        }
      });
      
      // Match voters with profiles
      const voterProfiles = allProfiles.filter(profile => 
        profile.user && voterUserIds.has(profile.user.id)
      );
      
      // Organize votes by category
      const votesMap = {};
      
      voterProfiles.forEach(profile => {
        const deptName = profile.department?.name || 'Unassigned Department';
        const courseName = profile.course?.name || 'Unassigned Course';
        const courseCode = profile.course?.code || 'N/A';
        const yearLevel = profile.year_level || 'N/A';
        
        // For department elections, organize by course → year level only
        // For university elections, organize by department → course → year level
        if (electionData.election_type === 'department') {
          // Department election: Course → Year Level
          if (!votesMap[courseName]) {
            votesMap[courseName] = {
              code: courseCode,
              yearLevels: {}
            };
          }
          if (!votesMap[courseName].yearLevels[yearLevel]) {
            votesMap[courseName].yearLevels[yearLevel] = {
              count: 0
            };
          }
          votesMap[courseName].yearLevels[yearLevel].count++;
        } else {
          // University election: Department → Course → Year Level
          if (!votesMap[deptName]) {
            votesMap[deptName] = {};
          }
          if (!votesMap[deptName][courseName]) {
            votesMap[deptName][courseName] = {
              code: courseCode,
              yearLevels: {}
            };
          }
          if (!votesMap[deptName][courseName].yearLevels[yearLevel]) {
            votesMap[deptName][courseName].yearLevels[yearLevel] = {
              count: 0
            };
          }
          votesMap[deptName][courseName].yearLevels[yearLevel].count++;
        }
      });
      
      setVotesByCategory(votesMap);
    } catch (error) {
      console.error('Error fetching votes by category:', error);
      setVotesByCategory({});
    }
  }, [mockVotesByCategory]);

  // Fetch election results function
  const fetchElectionResults = useCallback(async (electionId) => {
    if (!electionId) {
      return;
    }

    try {
      setLoadingResults(true);
      setError(null);
      
      
      // Fetch election details
      const electionResponse = await electionService.getById(electionId);
      if (!electionResponse || !electionResponse.data) {
        throw new Error('Election not found');
      }
      setElection(electionResponse.data);
      
      // Fetch results
      const resultsResponse = await votingService.getElectionResults(electionId);
      if (!resultsResponse || !resultsResponse.data) {
        throw new Error('Results not available');
      }
      const resultsData = resultsResponse.data;
      
      setElectionResults(resultsData.positions || []);
      
      // Set statistics
      setStatistics({
        total_voters: resultsData.total_voters || 0,
        total_votes: resultsData.total_ballots || 0,
        total_positions: resultsData.positions?.length || 0,
        turnout_percentage: 0
      });
      
      // Fetch students for statistics
      try {
        const profilesResponse = await authService.getAllProfiles();
        const allProfiles = profilesResponse.data || [];
        
        // Filter students based on election type
        let studentList = allProfiles.filter(profile => 
          profile.user && !profile.user.is_staff && !profile.user.is_superuser
        );
        
        // If this is a department-specific election, filter by department
        const electionData = electionResponse.data;
        if (electionData.election_type === 'department' && electionData.allowed_department) {
          // Handle both cases: allowed_department could be an ID (number) or an object with id
          const allowedDeptId = typeof electionData.allowed_department === 'object' 
            ? electionData.allowed_department.id 
            : electionData.allowed_department;
          
          if (allowedDeptId) {
            // Convert to number for consistent comparison
            const deptIdNum = Number(allowedDeptId);
            studentList = studentList.filter(profile => {
              const profileDeptId = profile.department?.id;
              // Convert to number for comparison to handle string/number mismatches
              return profileDeptId && Number(profileDeptId) === deptIdNum;
            });
            console.log(`Filtered students for department election. Department ID: ${deptIdNum}, Students found: ${studentList.length}`);
          }
        } else {
          console.log(`University election - including all students. Total: ${studentList.length}`);
        }
        // For university elections, include all students (no additional filtering needed)
        
        setTotalStudents(Math.max(studentList.length, resultsData.total_voters || 0));
        
        // Organize students by department, course, and year level
        const deptMap = {};
        studentList.forEach(profile => {
          const deptName = profile.department?.name || 'Unassigned Department';
          const courseName = profile.course?.name || 'Unassigned Course';
          const courseCode = profile.course?.code || 'N/A';
          const yearLevel = profile.year_level || 'N/A';
          const studentId = profile.student_id || 'N/A';
          const fullName = profile.user?.first_name && profile.user?.last_name
                          ? `${profile.user.first_name} ${profile.user.last_name}`.trim()
                          : profile.user?.username || 'Unknown';
          
          if (!deptMap[deptName]) {
            deptMap[deptName] = {};
          }
          if (!deptMap[deptName][courseName]) {
            deptMap[deptName][courseName] = {
              code: courseCode,
              yearLevels: {}
            };
          }
          if (!deptMap[deptName][courseName].yearLevels[yearLevel]) {
            deptMap[deptName][courseName].yearLevels[yearLevel] = {
              count: 0,
              students: []
            };
          }
          
          deptMap[deptName][courseName].yearLevels[yearLevel].students.push({
            student_id: studentId,
            name: fullName,
            year_level: yearLevel
          });
          deptMap[deptName][courseName].yearLevels[yearLevel].count++;
        });
        
        setStudentsByDept(deptMap);
        
        // If categorize votes is enabled, fetch and organize votes by category
        if (categorizeVotes) {
          await fetchVotesByCategory(electionId, electionData, allProfiles);
        } else {
          setVotesByCategory({});
        }
      } catch (profileError) {
        console.log('Cannot fetch student count:', profileError);
        setTotalStudents(resultsData.total_voters || 0);
        setStudentsByDept({});
        setVotesByCategory({});
        setMockVotesByCategory(null);
      }
    } catch (error) {
      console.error('Error fetching election results:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      setError(`Failed to load election results: ${errorMessage}`);
      // Don't clear the selection, just clear the results
      setElectionResults([]);
      setElection(null);
      setStatistics(null);
      setStudentsByDept({});
      setTotalStudents(0);
      setVotesByCategory({});
      setMockVotesByCategory(null);
    } finally {
      setLoadingResults(false);
    }
  }, [categorizeVotes, fetchVotesByCategory]);

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
      setMockVotesByCategory(null);
      setError(null);
    }
  }, [selectedElection, fetchElectionResults]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch departments
      const deptResponse = await programService.getDepartments();
      setDepartments(deptResponse.data || []);
      
      // Fetch all students
      const profilesResponse = await authService.getAllProfiles();
      const allProfiles = profilesResponse.data || [];
      const studentProfiles = allProfiles.filter(profile => 
        profile.user && !profile.user.is_staff && !profile.user.is_superuser
      );
      setStudents(studentProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const fetchCourses = async (departmentId) => {
    try {
      const response = await programService.getCourses(departmentId);
      setCourses(response.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];
    
    if (selectedDept) {
      filtered = filtered.filter(student => 
        student.department?.id === parseInt(selectedDept)
      );
    }
    
    if (selectedCourse) {
      filtered = filtered.filter(student => 
        student.course?.id === parseInt(selectedCourse)
      );
    }
    
    // Organize by department, course, and year level (same structure as election results)
    const organized = {};
    filtered.forEach(student => {
      const deptName = student.department?.name || 'Unassigned Department';
      const courseName = student.course?.name || 'Unassigned Course';
      const courseCode = student.course?.code || 'N/A';
      const yearLevel = student.year_level || 'N/A';
      const studentId = student.student_id || 'N/A';
      const fullName = student.user?.first_name && student.user?.last_name
                      ? `${student.user.first_name} ${student.user.last_name}`.trim()
                      : student.user?.username || 'Unknown';
      
      if (!organized[deptName]) {
        organized[deptName] = {};
      }
      if (!organized[deptName][courseName]) {
        organized[deptName][courseName] = {
          code: courseCode,
          yearLevels: {}
        };
      }
      if (!organized[deptName][courseName].yearLevels[yearLevel]) {
        organized[deptName][courseName].yearLevels[yearLevel] = {
          count: 0,
          students: []
        };
      }
      
      organized[deptName][courseName].yearLevels[yearLevel].students.push({
        student_id: studentId,
        name: fullName,
        year_level: yearLevel
      });
      organized[deptName][courseName].yearLevels[yearLevel].count++;
    });
    
    setFilteredStudents(organized);
  };

  // Generate mock students for testing
  const generateMockStudents = (count = 150) => {
    const departments = [
      { id: 1, name: 'College of Computing and Information Sciences' },
      { id: 2, name: 'College of Engineering' },
      { id: 3, name: 'College of Education' },
      { id: 4, name: 'College of Business Administration' }
    ];

    const courses = [
      { id: 1, name: 'Bachelor of Science in Computer Science', code: 'BSCS', deptId: 1 },
      { id: 2, name: 'Bachelor of Science in Information Technology', code: 'BSIT', deptId: 1 },
      { id: 3, name: 'Bachelor of Science in Information Systems', code: 'BSIS', deptId: 1 },
      { id: 4, name: 'Bachelor of Science in Civil Engineering', code: 'BSCE', deptId: 2 },
      { id: 5, name: 'Bachelor of Science in Electrical Engineering', code: 'BSEE', deptId: 2 },
      { id: 6, name: 'Bachelor of Elementary Education', code: 'BEED', deptId: 3 },
      { id: 7, name: 'Bachelor of Secondary Education', code: 'BSED', deptId: 3 },
      { id: 8, name: 'Bachelor of Science in Business Administration', code: 'BSBA', deptId: 4 },
      { id: 9, name: 'Bachelor of Science in Accountancy', code: 'BSA', deptId: 4 }
    ];

    const firstNames = [
      'John', 'Maria', 'Michael', 'Sarah', 'David', 'Jennifer', 'James', 'Lisa', 'Robert', 'Emily',
      'William', 'Jessica', 'Richard', 'Ashley', 'Joseph', 'Amanda', 'Thomas', 'Melissa', 'Charles', 'Michelle',
      'Christopher', 'Kimberly', 'Daniel', 'Amy', 'Matthew', 'Angela', 'Anthony', 'Stephanie', 'Mark', 'Nicole',
      'Donald', 'Elizabeth', 'Steven', 'Helen', 'Paul', 'Sandra', 'Andrew', 'Donna', 'Joshua', 'Carol',
      'Kenneth', 'Ruth', 'Kevin', 'Sharon', 'Brian', 'Michelle', 'George', 'Laura', 'Timothy', 'Sarah'
    ];

    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
      'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
      'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
      'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
      'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez'
    ];

    const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

    const mockStudents = [];
    const currentYear = new Date().getFullYear();
    
    for (let i = 0; i < count; i++) {
      const dept = departments[Math.floor(Math.random() * departments.length)];
      const deptCourses = courses.filter(c => c.deptId === dept.id);
      const course = deptCourses[Math.floor(Math.random() * deptCourses.length)];
      
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const yearLevel = yearLevels[Math.floor(Math.random() * yearLevels.length)];
      const studentId = `${currentYear - Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      
      mockStudents.push({
        id: i + 1,
        student_id: studentId,
        year_level: yearLevel,
        department: { id: dept.id, name: dept.name },
        course: { id: course.id, name: course.name, code: course.code },
        user: {
          id: i + 1,
          first_name: firstName,
          last_name: lastName,
          username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}`,
          is_staff: false,
          is_superuser: false
        }
      });
    }

    return mockStudents;
  };

  const loadMockStudents = () => {
    const mockStudents = generateMockStudents(150);
    
    // Organize by department, course, and year level (same structure as election results)
    const organized = {};
    mockStudents.forEach(student => {
      const deptName = student.department?.name || 'Unassigned Department';
      const courseName = student.course?.name || 'Unassigned Course';
      const courseCode = student.course?.code || 'N/A';
      const yearLevel = student.year_level || 'N/A';
      const studentId = student.student_id || 'N/A';
      const fullName = student.user?.first_name && student.user?.last_name
                      ? `${student.user.first_name} ${student.user.last_name}`.trim()
                      : student.user?.username || 'Unknown';
      
      if (!organized[deptName]) {
        organized[deptName] = {};
      }
      if (!organized[deptName][courseName]) {
        organized[deptName][courseName] = {
          code: courseCode,
          yearLevels: {}
        };
      }
      if (!organized[deptName][courseName].yearLevels[yearLevel]) {
        organized[deptName][courseName].yearLevels[yearLevel] = {
          count: 0,
          students: []
        };
      }
      
      organized[deptName][courseName].yearLevels[yearLevel].students.push({
        student_id: studentId,
        name: fullName,
        year_level: yearLevel
      });
      organized[deptName][courseName].yearLevels[yearLevel].count++;
    });
    
    // Temporarily set the data for export
    setStudents(mockStudents);
    setFilteredStudents(organized);
    
    // Wait a bit for state to update, then export (data will be cleared automatically in export function)
    setTimeout(() => {
      exportStudentDataToPDF(organized);
    }, 100);
  };

  const loadMockStudentsForElection = () => {
    const mockStudents = generateMockStudents(150);
    
    // Organize by department, course, and year level for election results
    const deptMap = {};
    mockStudents.forEach(student => {
      const deptName = student.department?.name || 'Unassigned Department';
      const courseName = student.course?.name || 'Unassigned Course';
      const courseCode = student.course?.code || 'N/A';
      const yearLevel = student.year_level || 'N/A';
      const studentId = student.student_id || 'N/A';
      const fullName = student.user?.first_name && student.user?.last_name
                      ? `${student.user.first_name} ${student.user.last_name}`.trim()
                      : student.user?.username || 'Unknown';
      
      if (!deptMap[deptName]) {
        deptMap[deptName] = {};
      }
      if (!deptMap[deptName][courseName]) {
        deptMap[deptName][courseName] = {
          code: courseCode,
          yearLevels: {}
        };
      }
      if (!deptMap[deptName][courseName].yearLevels[yearLevel]) {
        deptMap[deptName][courseName].yearLevels[yearLevel] = {
          count: 0,
          students: []
        };
      }
      
      deptMap[deptName][courseName].yearLevels[yearLevel].students.push({
        student_id: studentId,
        name: fullName,
        year_level: yearLevel
      });
      deptMap[deptName][courseName].yearLevels[yearLevel].count++;
    });
    
    // Generate mock votes for a random subset of students (70-90% voting rate)
    const votingRate = 0.7 + Math.random() * 0.2; // 70-90%
    const numVoters = Math.floor(mockStudents.length * votingRate);
    const shuffledStudents = [...mockStudents].sort(() => Math.random() - 0.5);
    const voters = shuffledStudents.slice(0, numVoters);
    
    // Organize mock votes by category (same structure as real votes)
    const electionData = election || { election_type: 'university' };
    const mockVotesMap = {};
    
    voters.forEach(student => {
      const deptName = student.department?.name || 'Unassigned Department';
      const courseName = student.course?.name || 'Unassigned Course';
      const courseCode = student.course?.code || 'N/A';
      const yearLevel = student.year_level || 'N/A';
      
      // For department elections, organize by course → year level only
      // For university elections, organize by department → course → year level
      if (electionData.election_type === 'department') {
        // Department election: Course → Year Level
        if (!mockVotesMap[courseName]) {
          mockVotesMap[courseName] = {
            code: courseCode,
            yearLevels: {}
          };
        }
        if (!mockVotesMap[courseName].yearLevels[yearLevel]) {
          mockVotesMap[courseName].yearLevels[yearLevel] = {
            count: 0
          };
        }
        mockVotesMap[courseName].yearLevels[yearLevel].count++;
      } else {
        // University election: Department → Course → Year Level
        if (!mockVotesMap[deptName]) {
          mockVotesMap[deptName] = {};
        }
        if (!mockVotesMap[deptName][courseName]) {
          mockVotesMap[deptName][courseName] = {
            code: courseCode,
            yearLevels: {}
          };
        }
        if (!mockVotesMap[deptName][courseName].yearLevels[yearLevel]) {
          mockVotesMap[deptName][courseName].yearLevels[yearLevel] = {
            count: 0
          };
        }
        mockVotesMap[deptName][courseName].yearLevels[yearLevel].count++;
      }
    });
    
    // Temporarily set the data for export
    setStudentsByDept(deptMap);
    setTotalStudents(mockStudents.length);
    setMockVotesByCategory(mockVotesMap); // Set mock votes
    // Always set votesByCategory with mock votes so they're available for export
    setVotesByCategory(mockVotesMap);
    
    // Create a temporary election object if none is selected
    const tempElection = election || { 
      title: 'Mock Election Results - Test Export', 
      id: 'mock',
      start_year: new Date().getFullYear(),
      end_year: new Date().getFullYear() + 1,
      election_type: 'university'
    };
    
    // Create temporary election results if none exist
    const tempElectionResults = electionResults && electionResults.length > 0 
      ? electionResults 
      : [{
          position_name: 'Mock Position',
          candidates: []
        }];
    
    // Store original values
    const originalElection = election;
    const originalElectionResults = electionResults;
    const originalStatistics = statistics;
    
    // Set temporary values for export
    if (!election) {
      setElection(tempElection);
    }
    if (!electionResults || electionResults.length === 0) {
      setElectionResults(tempElectionResults);
      setStatistics({
        total_voters: numVoters,
        total_votes: numVoters,
        total_positions: 1,
        turnout_percentage: Math.round((numVoters / mockStudents.length) * 100)
      });
    }
    
    // Wait a bit for state to update, then export (data will be cleared automatically in export function)
    setTimeout(() => {
      exportElectionResultsToPDF(deptMap, mockStudents.length);
      
      // Restore original values if they were empty (after a short delay to ensure export completes)
      setTimeout(() => {
        if (!originalElection) {
          setElection(null);
        }
        if (!originalElectionResults || originalElectionResults.length === 0) {
          setElectionResults(null);
          setStatistics(null);
        }
        // Clear mock votes
        setMockVotesByCategory(null);
        setVotesByCategory({});
      }, 500);
    }, 100);
  };

  const exportElectionResultsToPDF = (mockStudentsData = null, mockTotalStudents = null) => {
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

      // Add Vote Counts by Category if enabled OR if we have mock votes
      const votesToUse = mockVotesByCategory || votesByCategory;
      if ((categorizeVotes || mockVotesByCategory) && votesToUse && Object.keys(votesToUse).length > 0) {
        doc.addPage();
        yPosition = margin;
        
        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(11, 110, 59);
        doc.text(
          electionToUse.election_type === 'department' 
            ? 'Vote Counts by Course and Year Level' 
            : 'Vote Counts by Department, Course, and Year Level',
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
        
        if (electionToUse.election_type === 'department') {
          // Department election: Course → Year Level
          Object.keys(votesToUse).sort().forEach(courseName => {
            const courseData = votesToUse[courseName];
            checkPageBreak(40);
            
            // Course header
            doc.setFillColor(11, 110, 59);
            doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            const totalCourseVotes = Object.values(courseData.yearLevels).reduce((sum, yl) => sum + (yl.count || 0), 0);
            doc.text(`${courseName} (${courseData.code || 'N/A'}) - Total Votes: ${totalCourseVotes}`, margin + 5, yPosition);
            
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
              doc.rect(margin + 10, yPosition - 4, contentWidth - 20, 6, 'F');
              doc.text(`${yearLevel}: ${voteCount} vote${voteCount !== 1 ? 's' : ''}`, margin + 15, yPosition);
              
              yPosition += 8;
            });
            
            yPosition += 5; // Space between courses
          });
        } else {
          // University election: Department → Course → Year Level
          Object.keys(votesToUse).sort().forEach(deptName => {
            checkPageBreak(50);
            
            // Department header
            doc.setFillColor(11, 110, 59);
            doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text(deptName, margin + 5, yPosition);
            
            yPosition += 10;
            doc.setTextColor(0, 0, 0);
            
            // Courses
            Object.keys(votesToUse[deptName]).sort().forEach(courseName => {
              const courseData = votesToUse[deptName][courseName];
              checkPageBreak(40);
              
              // Course subheader
              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              const totalCourseVotes = Object.values(courseData.yearLevels).reduce((sum, yl) => sum + (yl.count || 0), 0);
              doc.text(`${courseName} (${courseData.code || 'N/A'}) - Total Votes: ${totalCourseVotes}`, margin + 5, yPosition);
              
              yPosition += 8;
              
              // Year levels
              Object.keys(courseData.yearLevels).sort().forEach(yearLevel => {
                checkPageBreak(15);
                const yearLevelData = courseData.yearLevels[yearLevel];
                const voteCount = yearLevelData.count || 0;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setFillColor(243, 244, 246);
                doc.rect(margin + 10, yPosition - 4, contentWidth - 20, 6, 'F');
                doc.text(`${yearLevel}: ${voteCount} vote${voteCount !== 1 ? 's' : ''}`, margin + 15, yPosition);
                
                yPosition += 8;
              });
              
              yPosition += 5; // Space between courses
            });
            
            yPosition += 5; // Space between departments
          });
        }
      }

      // Add Student Statistics by Department/Course on new page
      if (studentsDataToUse && Object.keys(studentsDataToUse).length > 0) {
        doc.addPage();
        yPosition = margin;
        
        doc.setFillColor(11, 110, 59);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Student Statistics by Department', pageWidth / 2, 25, { align: 'center' });
        
        yPosition = 50;
        doc.setTextColor(0, 0, 0);
        
        Object.keys(studentsDataToUse).sort().forEach(deptName => {
          checkPageBreak(40);
          
          doc.setFillColor(11, 110, 59);
          doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(deptName, margin + 3, yPosition);
          
          yPosition += 10;
          doc.setTextColor(0, 0, 0);
          
          const courses = studentsDataToUse[deptName];
          if (courses && typeof courses === 'object') {
            Object.keys(courses).sort().forEach(courseName => {
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
          'SURIGAO DEL NORTE STATE UNIVERSITY - E-Botar System',
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      const fileName = `Election_Results_${electionToUse.title?.replace(/[^a-z0-9]/gi, '_') || electionToUse.id || 'Mock'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      // If this was a mock data export, clear the data immediately after saving
      if (mockStudentsData) {
        setStudentsByDept({});
        setTotalStudents(0);
        setMockVotesByCategory(null);
        setVotesByCategory({});
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportStudentDataToPDF = (mockStudentsData = null) => {
    // Use mock data if provided, otherwise use state
    const studentsDataToUse = mockStudentsData || filteredStudents;
    
    if (Object.keys(studentsDataToUse).length === 0) {
      alert('No students to export. Please adjust your filters.');
      return;
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
      doc.text('Student Data Export', pageWidth / 2, 25, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const exportDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Exported on: ${exportDate}`, pageWidth / 2, 35, { align: 'center' });

      yPosition = 60;

      // Student data by department and course
      Object.keys(studentsDataToUse).sort().forEach(deptName => {
        checkPageBreak(50);
        
        doc.setFillColor(11, 110, 59);
        doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(deptName, margin + 3, yPosition);
        
        yPosition += 12;
        doc.setTextColor(0, 0, 0);

        const courses = studentsDataToUse[deptName];
        Object.keys(courses).sort().forEach(courseName => {
          checkPageBreak(50);
          
          const courseData = courses[courseName];
          
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
          
          yPosition += 5;
        });
        
        yPosition += 5;
      });

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
          'SURIGAO DEL NORTE STATE UNIVERSITY - E-Botar System',
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      const fileName = `Student_Export_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      // If this was a mock data export, clear the data immediately after saving
      if (mockStudentsData) {
        setStudents([]);
        setFilteredStudents({});
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <Container>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You must be an administrator to access this page.</p>
        </div>
      </Container>
    );
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading data..." />;
  }

  const totalStudentsCount = Object.values(filteredStudents).reduce((total, courses) => {
    return total + Object.values(courses).reduce((sum, course) => {
      // Handle both new structure (yearLevels) and old structure (students)
      if (course.yearLevels && typeof course.yearLevels === 'object') {
        return sum + Object.values(course.yearLevels).reduce((ylSum, yl) => ylSum + (yl.count || yl.students?.length || 0), 0);
      } else if (course.students && Array.isArray(course.students)) {
        return sum + course.students.length;
      }
      return sum;
    }, 0);
  }, 0);

  return (
    <div className="student-export-page">
      <Container>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Data Export
          </h1>
          <p style={{ color: '#6b7280' }}>
            Export election results and student data in PDF format
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '1.5rem',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('results')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'results' ? '#0b6e3b' : 'transparent',
              color: activeTab === 'results' ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'results' ? '3px solid #0b6e3b' : '3px solid transparent',
              borderRadius: '0.5rem 0.5rem 0 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Election Results
          </button>
          <button
            onClick={() => setActiveTab('students')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'students' ? '#0b6e3b' : 'transparent',
              color: activeTab === 'students' ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'students' ? '3px solid #0b6e3b' : '3px solid transparent',
              borderRadius: '0.5rem 0.5rem 0 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Student Data
          </button>
        </div>

        {/* Election Results Tab */}
        {activeTab === 'results' && (
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                Export Election Results
              </h2>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    opacity: loadingResults ? 0.6 : 1,
                    cursor: loadingResults ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">Select an election...</option>
                  {elections.map(elec => (
                    <option key={elec.id} value={String(elec.id)}>
                      {elec.title}
                    </option>
                  ))}
                </select>
                {loadingResults && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg className="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Loading election results...
                  </div>
                )}
                {electionResults && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={categorizeVotes}
                        onChange={(e) => setCategorizeVotes(e.target.checked)}
                        style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 500 }}>
                        Categorize vote counts by {election?.election_type === 'department' ? 'course and year level' : 'department, course, and year level'}
                      </span>
                    </label>
                    {election?.election_type === 'department' && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280', marginLeft: '1.5rem' }}>
                        Note: For department elections, votes will be categorized by course and year level only.
                      </div>
                    )}
                  </div>
                )}
                {error && (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.75rem', 
                    background: '#fee2e2', 
                    border: '1px solid #fca5a5',
                    borderRadius: '0.5rem',
                    color: '#991b1b',
                    fontSize: '0.875rem'
                  }}>
                    {error}
                    <button
                      onClick={() => setError(null)}
                      style={{
                        marginLeft: '0.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#991b1b',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              {electionResults && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Election Statistics
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                      {formatNumber(statistics?.total_voters || 0)} votes • {electionResults.length} positions
                    </div>
                    {Object.keys(studentsByDept).length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
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
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Button
                      onClick={loadMockStudentsForElection}
                      disabled={exporting}
                      style={{
                        background: '#8b5cf6',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      Load Mock Students (150)
                    </Button>
                    <Button
                      onClick={exportElectionResultsToPDF}
                      disabled={exporting || !electionResults}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      {exporting ? 'Generating PDF...' : 'Export Results PDF'}
                    </Button>
                    <Button
                      onClick={async () => {
                        setExporting(true);
                        try {
                          await votingService.downloadExport(selectedElection, 'json');
                        } catch (error) {
                          console.error('Export error:', error);
                          alert('Failed to export results. Please try again.');
                        } finally {
                          setExporting(false);
                        }
                      }}
                      disabled={exporting || !electionResults}
                      style={{
                        background: '#2563eb',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      {exporting ? 'Exporting...' : 'Export JSON'}
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
            <div style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                Export Student Data
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Department
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Course
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    disabled={!selectedDept}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      opacity: !selectedDept ? 0.6 : 1
                    }}
                  >
                    <option value="">All Courses</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Total Students
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
                    {totalStudentsCount}
                  </div>
                </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button
                  onClick={loadMockStudents}
                  disabled={exporting}
                  style={{
                    background: '#8b5cf6',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  Load Mock Students (150)
                </Button>
                <Button
                  onClick={() => {
                    const testData = {
                      'College of Computing and Information Sciences': {
                        'Bachelor of Science in Computer Science (BSCS)': {
                          code: 'BSCS',
                          students: [
                            { student_id: '2022-00819', name: 'John Andrei Julve', year_level: '4th Year' },
                            { student_id: '2025-66634', name: 'Maria Rodriguez', year_level: '3rd Year' }
                          ]
                        },
                        'Bachelor of Science in Information Technology (BSIT)': {
                          code: 'BSIT',
                          students: [
                            { student_id: '2022-00444', name: 'Jumar Guardalupe', year_level: '4th Year' }
                          ]
                        }
                      }
                    };
                    setFilteredStudents(testData);
                    setTimeout(() => {
                      exportStudentDataToPDF();
                    }, 100);
                  }}
                  disabled={exporting}
                  style={{
                    background: '#f59e0b',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  {exporting ? 'Testing...' : 'Test Export (Sample Data)'}
                </Button>
                  <Button
                    onClick={exportStudentDataToPDF}
                    disabled={exporting || totalStudentsCount === 0}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    {exporting ? 'Generating PDF...' : 'Export to PDF'}
                  </Button>
                </div>
              </div>

              {/* Preview */}
              {Object.keys(filteredStudents).length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Preview
                  </h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {Object.keys(filteredStudents).sort().map(deptName => (
                      <div key={deptName} style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                          background: '#0b6e3b',
                          color: 'white',
                          padding: '0.75rem',
                          borderRadius: '0.5rem 0.5rem 0 0',
                          fontWeight: 600
                        }}>
                          {deptName}
                        </div>
                        {Object.keys(filteredStudents[deptName]).sort().map(courseName => {
                          const courseData = filteredStudents[deptName][courseName];
                          
                          // Calculate total students - handle both new (yearLevels) and old (students) structure
                          let totalStudents = 0;
                          if (courseData.yearLevels && typeof courseData.yearLevels === 'object') {
                            totalStudents = Object.values(courseData.yearLevels).reduce((sum, yl) => sum + (yl.count || yl.students?.length || 0), 0);
                          } else if (courseData.students && Array.isArray(courseData.students)) {
                            totalStudents = courseData.students.length;
                          }
                          
                          return (
                            <div key={courseName} style={{
                              border: '1px solid #e5e7eb',
                              borderTop: 'none',
                              padding: '1rem'
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                                {courseName} ({courseData.code || 'N/A'}) - {totalStudents} student{totalStudents !== 1 ? 's' : ''}
                              </div>
                              {courseData.yearLevels && typeof courseData.yearLevels === 'object' ? (
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {Object.keys(courseData.yearLevels).sort().map(yearLevel => {
                                    const yearLevelData = courseData.yearLevels[yearLevel];
                                    const count = yearLevelData.count || yearLevelData.students?.length || 0;
                                    return (
                                      <div key={yearLevel} style={{ marginTop: '0.25rem' }}>
                                        {yearLevel}: {count} student{count !== 1 ? 's' : ''}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {totalStudents} student{totalStudents !== 1 ? 's' : ''} enrolled
                                </div>
                              )}
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

