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
  const { isStaffOrAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('results'); // 'results' or 'students'
  
  // Student export state
  const [departments, setDepartments] = useState([]);
  const [allCourses, setAllCourses] = useState([]); // All courses for mock data generation
  const [courses, setCourses] = useState([]); // Filtered courses for dropdown
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState({});
  const [selectedElectionForStudents, setSelectedElectionForStudents] = useState(''); // Election selection for student data export
  const [electionForStudents, setElectionForStudents] = useState(null); // Election details for student data export
  const [voterUserIds, setVoterUserIds] = useState(new Set()); // Set of user IDs who voted in selected election
  const [showStudentNames, setShowStudentNames] = useState(false); // Option to show individual student names
  
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

  useEffect(() => {
    filterStudents();
  }, [selectedDept, selectedCourse, students, selectedElectionForStudents, electionForStudents]);
  
  // Fetch election details and ballots when election is selected for student data
  useEffect(() => {
    if (selectedElectionForStudents) {
      const fetchElectionForStudents = async () => {
        try {
          const electionResponse = await electionService.getById(selectedElectionForStudents);
          if (electionResponse && electionResponse.data) {
            const electionData = electionResponse.data;
            setElectionForStudents(electionData);
            
            // If it's a department election, automatically set and lock the department
            if (electionData.election_type === 'department' && electionData.allowed_department) {
              const allowedDeptId = typeof electionData.allowed_department === 'object' 
                ? electionData.allowed_department.id 
                : electionData.allowed_department;
              
              if (allowedDeptId) {
                const deptIdStr = String(allowedDeptId);
                setSelectedDept(deptIdStr);
                // Fetch courses for this department
                try {
                  const coursesResponse = await programService.getCourses(allowedDeptId);
                  setCourses(coursesResponse.data || []);
                } catch (courseError) {
                  console.error('Error fetching courses:', courseError);
                  setCourses([]);
                }
              }
            } else {
              // For university elections, clear department selection
              setSelectedDept('');
              setSelectedCourse('');
              setCourses([]);
            }
            
            // Fetch ballots for this election to determine who voted
            try {
              const ballotsResponse = await votingService.getMyBallots();
              const allBallots = ballotsResponse.data || [];
              // Filter ballots for this election
              const electionBallots = allBallots.filter(ballot => {
                const ballotElectionId = ballot.election?.id || ballot.election;
                return ballotElectionId === parseInt(selectedElectionForStudents) || ballotElectionId === selectedElectionForStudents;
              });
              // Extract user IDs who voted
              const voterIds = new Set();
              electionBallots.forEach(ballot => {
                const userId = ballot.user?.id || ballot.user;
                if (userId) {
                  voterIds.add(userId);
                }
              });
              setVoterUserIds(voterIds);
            } catch (ballotError) {
              console.error('Error fetching ballots:', ballotError);
              setVoterUserIds(new Set());
            }
          }
        } catch (error) {
          console.error('Error fetching election for student data:', error);
          setElectionForStudents(null);
          setVoterUserIds(new Set());
        }
      };
      fetchElectionForStudents();
    } else {
      setElectionForStudents(null);
      setVoterUserIds(new Set());
      // Clear department/course filters when no election is selected
      setSelectedDept('');
      setSelectedCourse('');
      setCourses([]);
    }
  }, [selectedElectionForStudents]);

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
        const deptCode = profile.department?.code || 'N/A';
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
            votesMap[deptName] = {
              code: deptCode
            };
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
          }
        }
        // For university elections, include all students (no additional filtering needed)
        
        setTotalStudents(Math.max(studentList.length, resultsData.total_voters || 0));
        
        // Organize students by department, course, and year level
        const deptMap = {};
        studentList.forEach(profile => {
          const deptName = profile.department?.name || 'Unassigned Department';
          const deptCode = profile.department?.code || 'N/A';
          const courseName = profile.course?.name || 'Unassigned Course';
          const courseCode = profile.course?.code || 'N/A';
          const yearLevel = profile.year_level || 'N/A';
          const studentId = profile.student_id || 'N/A';
          const fullName = profile.user?.first_name && profile.user?.last_name
                          ? `${profile.user.first_name} ${profile.user.last_name}`.trim()
                          : profile.user?.username || 'Unknown';
          
          if (!deptMap[deptName]) {
            deptMap[deptName] = {
              code: deptCode
            };
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
        // Cannot fetch student count, using fallback
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
      
      // Fetch departments and courses using public endpoints (accessible to staff)
      // These endpoints use AllowAny permission, so staff can access them
      const [departmentsResponse, coursesResponse] = await Promise.all([
        programService.getDepartments().catch(() => ({ data: [] })),
        programService.getCourses().catch(() => ({ data: [] }))
      ]);
      
      const deptList = departmentsResponse.data || [];
      const courseList = coursesResponse.data || [];
      
      setDepartments(deptList);
      setAllCourses(courseList);
      
      // Fetch all students (staff can access all profiles)
      const profilesResponse = await authService.getAllProfiles();
      const allProfiles = profilesResponse.data || [];
      const studentProfiles = allProfiles.filter(profile => 
        profile.user && !profile.user.is_staff && !profile.user.is_superuser
      );
      setStudents(studentProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Show error to user if critical
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
    
    // Filter by election first (if election is selected)
    if (selectedElectionForStudents && electionForStudents) {
      // If this is a department-specific election, filter by department
      if (electionForStudents.election_type === 'department' && electionForStudents.allowed_department) {
        const allowedDeptId = typeof electionForStudents.allowed_department === 'object' 
          ? electionForStudents.allowed_department.id 
          : electionForStudents.allowed_department;
        
        if (allowedDeptId) {
          const deptIdNum = Number(allowedDeptId);
          filtered = filtered.filter(student => {
            const studentDeptId = student.department?.id;
            return studentDeptId && Number(studentDeptId) === deptIdNum;
          });
        }
      }
      // For university elections, include all students (no additional filtering needed)
      // Note: Voting status is now shown in the table, so we don't filter by it here
    }
    
    // Then apply manual department/course filters (if any)
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
      const deptCode = student.department?.code || 'N/A';
      const courseName = student.course?.name || 'Unassigned Course';
      const courseCode = student.course?.code || 'N/A';
      const yearLevel = student.year_level || 'N/A';
      const studentId = student.student_id || 'N/A';
      const fullName = student.user?.first_name && student.user?.last_name
                      ? `${student.user.first_name} ${student.user.last_name}`.trim()
                      : student.user?.username || 'Unknown';
      
      if (!organized[deptName]) {
        organized[deptName] = {
          code: deptCode
        };
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
        year_level: yearLevel,
        user: {
          id: student.user?.id || student.user
        }
      });
      organized[deptName][courseName].yearLevels[yearLevel].count++;
    });
    
    setFilteredStudents(organized);
  };

  // Generate mock students for testing - uses actual departments and courses from database
  const generateMockStudents = (count = 150) => {
    // Use actual departments and courses from database
    let availableDepartments = departments.filter(dept => dept.program_type === 'department');
    let availableCourses = allCourses.filter(course => course.program_type === 'course');
    
    // If lists are empty but we have selected values, use those
    if (availableDepartments.length === 0 && selectedDept) {
      // Try to find in departments array first
      const selectedDeptObj = departments.find(d => String(d.id) === selectedDept);
      if (selectedDeptObj) {
        availableDepartments = [selectedDeptObj];
      } else {
        // If not found, try to get from the courses array's department reference
        const courseWithDept = courses.find(c => c.department && String(c.department.id) === selectedDept);
        if (courseWithDept && courseWithDept.department) {
          availableDepartments = [courseWithDept.department];
        }
      }
    }
    
    // If courses list is empty, try using the filtered courses array (populated when dept is selected)
    if (availableCourses.length === 0) {
      if (courses.length > 0) {
        // Use the courses array which is populated when a department is selected
        availableCourses = courses;
      } else if (selectedCourse) {
        // If we have a selected course but courses array is empty, try allCourses
        const selectedCourseObj = allCourses.find(c => String(c.id) === selectedCourse);
        if (selectedCourseObj) {
          availableCourses = [selectedCourseObj];
        }
      }
    }
    
    // If we still have no courses but have a selected course, we need at least one course to generate
    // In this case, we'll create a minimal course object from the selected course ID
    if (availableCourses.length === 0 && selectedCourse && selectedDept) {
      // We can't generate without course data, so return empty
      console.warn('Cannot generate mock students: No course data available');
      return [];
    }
    
    // If still no departments or courses available, return empty array
    if (availableDepartments.length === 0 || availableCourses.length === 0) {
      console.warn('Cannot generate mock students:', {
        availableDepartments: availableDepartments.length,
        availableCourses: availableCourses.length,
        departments: departments.length,
        allCourses: allCourses.length,
        courses: courses.length,
        selectedDept,
        selectedCourse
      });
      return [];
    }
    
    // Build a map of courses by department ID for quick lookup
    const coursesByDept = {};
    availableCourses.forEach(course => {
      const deptId = course.department?.id || course.department;
      if (deptId) {
        if (!coursesByDept[deptId]) {
          coursesByDept[deptId] = [];
        }
        coursesByDept[deptId].push(course);
      }
    });

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
    
    // Only generate if we have departments with courses
    let departmentsWithCourses = availableDepartments.filter(dept => {
      const deptId = dept.id;
      return coursesByDept[deptId] && coursesByDept[deptId].length > 0;
    });
    
    // If no departments with courses found, but we have available courses,
    // try to match courses to departments by department ID in the course object
    if (departmentsWithCourses.length === 0 && availableCourses.length > 0) {
      // Group courses by their department
      const deptIdsFromCourses = new Set();
      availableCourses.forEach(course => {
        const deptId = course.department?.id || course.department;
        if (deptId) {
          deptIdsFromCourses.add(deptId);
        }
      });
      
      // Find departments that match these course departments
      departmentsWithCourses = availableDepartments.filter(dept => {
        return deptIdsFromCourses.has(dept.id);
      });
      
      // If still none, but we have available departments and courses, use all available departments
      if (departmentsWithCourses.length === 0 && availableDepartments.length > 0 && availableCourses.length > 0) {
        departmentsWithCourses = availableDepartments;
        // Rebuild coursesByDept to include all courses
        availableCourses.forEach(course => {
          const deptId = course.department?.id || course.department;
          if (deptId) {
            if (!coursesByDept[deptId]) {
              coursesByDept[deptId] = [];
            }
            coursesByDept[deptId].push(course);
          }
        });
      }
    }
    
    if (departmentsWithCourses.length === 0 || availableCourses.length === 0) {
      return [];
    }
    
    for (let i = 0; i < count; i++) {
      // Pick a random department that has courses
      const dept = departmentsWithCourses[Math.floor(Math.random() * departmentsWithCourses.length)];
      const deptId = dept.id;
      let deptCourses = coursesByDept[deptId] || [];
      
      // If no courses for this department, use all available courses
      if (deptCourses.length === 0) {
        deptCourses = availableCourses;
      }
      
      if (deptCourses.length === 0) {
        continue; // Skip if still no courses
      }
      
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
    // Check if election is selected
    if (!selectedElectionForStudents) {
      alert('Please select an election first before loading mock students.');
      return;
    }
    
    // Check if we have at least one department and course available
    // Use selected department/course if available, otherwise check the lists
    const hasDept = selectedDept || (departments && departments.length > 0);
    const hasCourse = selectedCourse || (allCourses && allCourses.length > 0);
    
    if (!hasDept || !hasCourse) {
      // If we have selected values, we can still generate mock data
      if (selectedDept && selectedCourse) {
        // We have selected values, we can proceed
      } else {
        alert('Please wait for data to load, or ensure departments and courses are added in Program Management. You can also select a specific department and course to generate mock data.');
        return;
      }
    }
    
    const mockStudents = generateMockStudents(150);
    
    // If no mock students generated (no programs available), show empty template
    if (mockStudents.length === 0) {
      alert('No departments or courses available in the database. Please add programs first before generating mock data.');
      return;
    }
    
    // Generate mock votes for a random subset of students (70-90% voting rate)
    const votingRate = 0.7 + Math.random() * 0.2; // 70-90%
    const numVoters = Math.floor(mockStudents.length * votingRate);
    const shuffledStudents = [...mockStudents].sort(() => Math.random() - 0.5);
    const voters = shuffledStudents.slice(0, numVoters);
    
    // Create a Set of voter user IDs for voting status checking
    const mockVoterIds = new Set();
    voters.forEach(voter => {
      const userId = voter.user?.id || voter.user || voter.id;
      if (userId) {
        mockVoterIds.add(Number(userId));
      }
    });
    setVoterUserIds(mockVoterIds);
    
    // Organize by department, course, and year level (same structure as election results)
    const organized = {};
    mockStudents.forEach(student => {
      const deptName = student.department?.name || 'Unassigned Department';
      const deptCode = student.department?.code || 'N/A';
      const courseName = student.course?.name || 'Unassigned Course';
      const courseCode = student.course?.code || 'N/A';
      const yearLevel = student.year_level || 'N/A';
      const studentId = student.student_id || 'N/A';
      const fullName = student.user?.first_name && student.user?.last_name
                      ? `${student.user.first_name} ${student.user.last_name}`.trim()
                      : student.user?.username || 'Unknown';
      
      if (!organized[deptName]) {
        organized[deptName] = {
          code: deptCode
        };
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
        year_level: yearLevel,
        user: {
          id: student.user?.id || student.user || student.id
        }
      });
      organized[deptName][courseName].yearLevels[yearLevel].count++;
    });
    
    // Set the data for display and export
    setStudents(mockStudents);
    setFilteredStudents(organized);
    
    // Show success message
    alert(`Successfully loaded ${mockStudents.length} mock students (${numVoters} voted, ${mockStudents.length - numVoters} did not vote). You can now export to PDF.`);
  };

  const loadMockStudentsForElection = () => {
    // Check if data is loaded
    if (departments.length === 0 || allCourses.length === 0) {
      alert('Please wait for data to load, or ensure departments and courses are added in Program Management.');
      return;
    }
    
    const mockStudents = generateMockStudents(150);
    
    // If no mock students generated (no programs available), show empty template
    if (mockStudents.length === 0) {
      alert('No departments or courses available in the database. Please add programs first before generating mock data.');
      return;
    }
    
    // Organize by department, course, and year level for election results
    const deptMap = {};
    mockStudents.forEach(student => {
      const deptName = student.department?.name || 'Unassigned Department';
      const deptCode = student.department?.code || 'N/A';
      const courseName = student.course?.name || 'Unassigned Course';
      const courseCode = student.course?.code || 'N/A';
      const yearLevel = student.year_level || 'N/A';
      const studentId = student.student_id || 'N/A';
      const fullName = student.user?.first_name && student.user?.last_name
                      ? `${student.user.first_name} ${student.user.last_name}`.trim()
                      : student.user?.username || 'Unknown';
      
      if (!deptMap[deptName]) {
        deptMap[deptName] = {
          code: deptCode
        };
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
        year_level: yearLevel,
        user: {
          id: student.user?.id || student.user || student.id
        }
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
            const deptCode = votesToUse[deptName]?.code || 'N/A';
            doc.text(`${deptName} (${deptCode})`, margin + 5, yPosition);
            
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
      // Show blank template if no data available
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
    // Check if election is selected (unless using mock data)
    if (!selectedElectionForStudents && !mockStudentsData) {
      alert('Please select an election first to export student data.');
      return;
    }
    
    // Check if showing names but no course selected
    if (showStudentNames && !selectedCourse) {
      alert('Please select a specific course to show student names.');
      return;
    }
    
    // Use mock data if provided, otherwise use state
    const studentsDataToUse = mockStudentsData || filteredStudents;
    
    // Check if jsPDF is available
    if (typeof jsPDF === 'undefined' || !jsPDF) {
      alert('PDF library not loaded. Please refresh the page and try again.');
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
      doc.rect(0, 0, pageWidth, electionForStudents ? 60 : 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Data Export', pageWidth / 2, 25, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Show election context if available
      if (electionForStudents) {
        doc.text(`Election: ${electionForStudents.title || 'N/A'}`, pageWidth / 2, 35, { align: 'center' });
        if (electionForStudents.election_type === 'department' && electionForStudents.allowed_department) {
          const deptName = typeof electionForStudents.allowed_department === 'object' 
            ? electionForStudents.allowed_department.name 
            : 'Department Election';
          doc.setFontSize(10);
          doc.text(`Department: ${deptName}`, pageWidth / 2, 45, { align: 'center' });
        }
      }
      
      const exportDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.setFontSize(10);
      doc.text(`Exported on: ${exportDate}`, pageWidth / 2, electionForStudents ? 52 : 35, { align: 'center' });

      yPosition = electionForStudents ? 65 : 55;

      // Student data by department and course
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
          if (courses && typeof courses === 'object') {
            Object.keys(courses).filter(key => key !== 'code').sort().forEach(courseName => {
              checkPageBreak(50);
          
          const courseData = courses[courseName];
          
          // Check if using new structure (yearLevels) or old structure (students array)
          const hasYearLevels = courseData.yearLevels && typeof courseData.yearLevels === 'object';
          const hasStudents = courseData.students && Array.isArray(courseData.students);
          
          if (!hasYearLevels && !hasStudents) {
            return;
          }
          
          // Note: When showStudentNames is enabled, filterStudents already filters by selectedCourse
          // So we should only have data for the selected course
          
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
            // New structure: Group by year level
            const yearLevelKeys = Object.keys(courseData.yearLevels).sort();
            yearLevelKeys.forEach(yearLevel => {
              checkPageBreak(20);
              
              const yearLevelData = courseData.yearLevels[yearLevel];
              const yearLevelCount = yearLevelData.count || yearLevelData.students?.length || 0;
              const studentsList = yearLevelData.students || [];
              
              // Year level subheader
              doc.setFontSize(10);
              doc.setFont('helvetica', 'bold');
              doc.setFillColor(243, 244, 246);
              doc.rect(margin + 10, yPosition - 4, contentWidth - 20, 6, 'F');
              doc.setTextColor(0, 0, 0);
              doc.text(`${yearLevel}: ${yearLevelCount} student${yearLevelCount !== 1 ? 's' : ''}`, margin + 15, yPosition);
              
              yPosition += 8;
              
              // Show student names in table format if option is enabled
              // Since filterStudents already filters by selectedCourse when showStudentNames is enabled,
              // we can safely show names for all students in the current course
              if (showStudentNames && selectedCourse && studentsList && studentsList.length > 0) {
                // Sort students by name
                const sortedStudents = [...studentsList].sort((a, b) => {
                  const nameA = (a.name || '').toLowerCase();
                  const nameB = (b.name || '').toLowerCase();
                  return nameA.localeCompare(nameB);
                });
                
                // Calculate table dimensions
                const tableStartX = margin + 15;
                const tableWidth = contentWidth - 30;
                const nameColumnWidth = tableWidth * 0.7; // 70% for name
                const statusColumnWidth = tableWidth * 0.3; // 30% for status
                const rowHeight = 7;
                const headerHeight = 8;
                
                // Check if we need a new page for the table
                const tableHeight = headerHeight + (sortedStudents.length * rowHeight);
                checkPageBreak(tableHeight);
                
                // Table header with borders
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setFillColor(11, 110, 59);
                doc.rect(tableStartX, yPosition - 4, nameColumnWidth, headerHeight, 'F');
                doc.rect(tableStartX + nameColumnWidth, yPosition - 4, statusColumnWidth, headerHeight, 'F');
                doc.setTextColor(255, 255, 255);
                doc.text('Student Name', tableStartX + 3, yPosition + 2);
                doc.text('Voting Status', tableStartX + nameColumnWidth + 3, yPosition + 2);
                
                // Draw header borders
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.2);
                doc.line(tableStartX + nameColumnWidth, yPosition - 4, tableStartX + nameColumnWidth, yPosition + headerHeight - 4);
                doc.line(tableStartX, yPosition - 4, tableStartX + tableWidth, yPosition - 4);
                doc.line(tableStartX, yPosition + headerHeight - 4, tableStartX + tableWidth, yPosition + headerHeight - 4);
                
                yPosition += headerHeight;
                
                // Table rows
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                sortedStudents.forEach((student, index) => {
                  checkPageBreak(rowHeight);
                  
                  // Alternate row colors for readability
                  if (index % 2 === 0) {
                    doc.setFillColor(249, 250, 251);
                    doc.rect(tableStartX, yPosition - 4, tableWidth, rowHeight, 'F');
                  }
                  
                  // Check voting status - convert to number for consistent comparison
                  const studentUserId = student.user?.id || student.user;
                  let hasVoted = false;
                  if (studentUserId && voterUserIds && voterUserIds.size > 0) {
                    try {
                      const userIdNum = Number(studentUserId);
                      if (!isNaN(userIdNum)) {
                        // Check if the Set contains the user ID (handle both number and string)
                        hasVoted = voterUserIds.has(userIdNum) || 
                                   voterUserIds.has(String(userIdNum)) || 
                                   (Array.isArray(Array.from(voterUserIds)) && Array.from(voterUserIds).some(id => {
                                     const idNum = Number(id);
                                     return !isNaN(idNum) && idNum === userIdNum;
                                   }));
                      }
                    } catch (e) {
                      console.warn('Error checking voting status for student:', studentUserId, e);
                    }
                  }
                  
                  // Student name (without student ID)
                  doc.setTextColor(0, 0, 0);
                  const studentName = student.name || 'Unknown';
                  // Truncate if too long
                  const maxNameWidth = nameColumnWidth - 6;
                  let truncatedName;
                  try {
                    truncatedName = doc.splitTextToSize(studentName, maxNameWidth);
                    if (Array.isArray(truncatedName)) {
                      truncatedName = truncatedName[0];
                    }
                  } catch (e) {
                    // If splitTextToSize fails, just use the original name
                    truncatedName = studentName.length > 50 ? studentName.substring(0, 47) + '...' : studentName;
                  }
                  doc.text(truncatedName, tableStartX + 3, yPosition + 2);
                  
                  // Voting status
                  doc.setFont('helvetica', 'bold');
                  if (hasVoted) {
                    doc.setTextColor(22, 163, 74); // Green for voted
                    doc.text('✓ Voted', tableStartX + nameColumnWidth + 3, yPosition + 2);
                  } else {
                    doc.setTextColor(220, 38, 38); // Red for not voted
                    doc.text('✗ Not Voted', tableStartX + nameColumnWidth + 3, yPosition + 2);
                  }
                  doc.setFont('helvetica', 'normal');
                  
                  // Draw row border
                  doc.setDrawColor(209, 213, 219);
                  doc.setLineWidth(0.1);
                  doc.line(tableStartX, yPosition + rowHeight - 4, tableStartX + tableWidth, yPosition + rowHeight - 4);
                  
                  yPosition += rowHeight;
                });
                
                // Add spacing after table
                yPosition += 3;
              }
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
          }
          
          yPosition += 5;
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

      const fileName = `Student_Export_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      // If this was a mock data export, clear the data immediately after saving
      if (mockStudentsData) {
        setStudents([]);
        setFilteredStudents({});
      }
    } catch (error) {
      console.error('PDF export error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        studentsDataToUse: studentsDataToUse,
        filteredStudents: filteredStudents,
        selectedElectionForStudents: selectedElectionForStudents,
        showStudentNames: showStudentNames,
        selectedCourse: selectedCourse,
        voterUserIds: Array.from(voterUserIds)
      });
      alert(`Failed to export PDF: ${error.message || 'Unknown error'}. Please check the browser console (F12) for details.`);
    } finally {
      setExporting(false);
    }
  };

  if (!isStaffOrAdmin) {
    return (
      <Container>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You must be staff or an administrator to access this page.</p>
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
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select an election...</option>
                  {elections.map(elec => (
                    <option key={elec.id} value={String(elec.id)}>
                      {elec.title}
                    </option>
                  ))}
                </select>
                {electionForStudents && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    {electionForStudents.election_type === 'department' 
                      ? `Department Election: ${typeof electionForStudents.allowed_department === 'object' ? electionForStudents.allowed_department.name : 'Selected Department'}`
                      : 'University Election: All Students'}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Department
                    {electionForStudents?.election_type === 'department' && (
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                        (Locked by Election)
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    disabled={electionForStudents?.election_type === 'department'}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      opacity: electionForStudents?.election_type === 'department' ? 0.6 : 1,
                      cursor: electionForStudents?.election_type === 'department' ? 'not-allowed' : 'pointer',
                      background: electionForStudents?.election_type === 'department' ? '#f3f4f6' : 'white'
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={String(dept.id)}>
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
                      <option key={course.id} value={String(course.id)}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Show Student Names Option */}
              {selectedElectionForStudents && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showStudentNames}
                      onChange={(e) => {
                        setShowStudentNames(e.target.checked);
                        if (e.target.checked && !selectedCourse) {
                          // If enabling but no course selected, show warning
                          setTimeout(() => {
                            if (!selectedCourse) {
                              alert('Please select a specific course to show student names. Names cannot be displayed for all courses at once.');
                            }
                          }, 100);
                        }
                      }}
                      style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 500 }}>
                      Show Student Names in Export
                    </span>
                  </label>
                  {showStudentNames && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        ⚠️ <strong>Note:</strong> When showing names, you must select a specific course. Names cannot be displayed for all courses at once.
                      </div>
                      {!selectedCourse && (
                        <div style={{ color: '#dc2626', fontWeight: 500 }}>
                          Please select a course above to show student names.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                     if (!selectedElectionForStudents) {
                       alert('Please select an election first.');
                       return;
                     }
                     if (showStudentNames && !selectedCourse) {
                       alert('Please select a specific course to show student names. Names cannot be displayed for all courses at once.');
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
                   disabled={exporting || !selectedElectionForStudents || (showStudentNames && !selectedCourse)}
                   style={{
                     background: '#dc2626',
                     color: 'white',
                     padding: '0.75rem 1.5rem',
                     fontSize: '0.875rem',
                     fontWeight: 500,
                     opacity: !selectedElectionForStudents ? 0.6 : 1,
                     cursor: !selectedElectionForStudents ? 'not-allowed' : 'pointer'
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

