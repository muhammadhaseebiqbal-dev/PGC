import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, MessageSquare, Plus, Eye, Mail, Phone, User, Calendar, Users, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import PermissionGuard from '../PermissionGuard';
import api from '../../services/api';
import { PERMISSIONS } from '../../utils/rolePermissions';

const CorrespondenceManagement = () => {
  const [activeTab, setActiveTab] = useState('enquiry'); // 'enquiry' or 'student'
  const [enquiries, setEnquiries] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [correspondenceNote, setCorrespondenceNote] = useState('');
  const [addingCorrespondence, setAddingCorrespondence] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/students');
      const data = response.data?.data || response.data || [];
      const enquiriesArray = Array.isArray(data) ? data : [data];
      setEnquiries(enquiriesArray);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/students');
      const data = response.data?.data || response.data || [];
      const studentsArray = Array.isArray(data) ? data : [data];
      
      // For debugging - log the data to see what we have
      console.log('All students data:', studentsArray.slice(0, 3).map(s => ({
        name: s.fullName,
        enquiryLevel: s.enquiryLevel,
        level: s.level,
        prospectusStage: s.prospectusStage,
        isApproved: s.isApproved
      })));
      
      // For student correspondence, include all students with any record
      // We can filter by level in the UI dropdown instead
      const validStudents = studentsArray.filter(student => 
        student.fullName && 
        (student.fullName.firstName || student.fullName.lastName) &&
        student.isApproved !== false
      );
      
      console.log('Filtered students for correspondence:', validStudents.length);
      setStudents(validStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'enquiry') {
      fetchEnquiries();
    } else {
      fetchStudents();
    }
  }, [activeTab, fetchEnquiries, fetchStudents]);

  const handleAddCorrespondence = (record) => {
    setSelectedRecord(record);
    setCorrespondenceNote('');
    setShowAddModal(true);
  };

  const handleSaveCorrespondence = async () => {
    if (!correspondenceNote.trim()) {
      alert('Please enter a note');
      return;
    }

    setAddingCorrespondence(true);
    try {
      const response = await api.post('/remarks/add-remark', {
        studentId: selectedRecord._id || selectedRecord.id,
        remark: correspondenceNote.trim()
      });

      if (response.data.success) {
        // Close modal and reset state
        setShowAddModal(false);
        setCorrespondenceNote('');
        setSelectedRecord(null);
        
        // Show success message
        alert('Correspondence added successfully');
      }
    } catch (error) {
      console.error('Error adding correspondence:', error);
      alert('Failed to add correspondence. Please try again.');
    } finally {
      setAddingCorrespondence(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setCorrespondenceNote('');
    setSelectedRecord(null);
  };

  const handleViewCorrespondence = async (record) => {
    try {
      const response = await api.get(`/remarks/remarks/${record._id || record.id}`);
      const remarksData = response.data?.data?.remarks || [];
      
      // Show correspondence in a simple alert for now (can be enhanced later)
      if (remarksData.length > 0) {
        const correspondenceText = remarksData.map((remark, index) => 
          `${index + 1}. ${new Date(remark.createdAt || remark.timestamp).toLocaleDateString()} - ${remark.remark}`
        ).join('\n\n');
        alert(`Correspondence History:\n\n${correspondenceText}`);
      } else {
        alert('No correspondence found for this record.');
      }
    } catch (error) {
      console.error('Error fetching correspondence:', error);
      alert('Failed to fetch correspondence history.');
    }
  };

  // Filter records based on search term and level (cumulative approach)
  const currentData = activeTab === 'enquiry' ? enquiries : students;
  const filteredRecords = currentData.filter(record => {
    const nameMatch = `${record.fullName?.firstName || ''} ${record.fullName?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (record.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = (record.phoneNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const searchMatch = nameMatch || emailMatch || phoneMatch;
    
    // Cumulative level match - Level 2 includes Level 3 students, Level 3 includes Level 4 students, etc.
    const currentLevel = record.enquiryLevel || record.prospectusStage || record.level || 1;
    const levelMatch = filterLevel === '' || currentLevel >= parseInt(filterLevel);
    
    return searchMatch && levelMatch;
  });

  // Pagination logic
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredRecords.slice(startIndex, endIndex);

  // Reset pagination when tab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, filterLevel]);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getLevel = (record) => {
    const level = record.enquiryLevel || record.prospectusStage || record.level || 1;
    const levelNames = {
      1: 'Level 1 - Initial Enquiry',
      2: 'Level 2 - Follow-up', 
      3: 'Level 3 - Serious Interest',
      4: 'Level 4 - Documents Submitted',
      5: 'Level 5 - Admitted Student'
    };
    return levelNames[level] || `Level ${level}`;
  };

  const getLevelColor = (record) => {
    const level = record.enquiryLevel || record.prospectusStage || record.level || 1;
    const colors = {
      1: 'bg-blue-100 text-blue-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-green-100 text-green-800',
      4: 'bg-purple-100 text-purple-800',
      5: 'bg-emerald-100 text-emerald-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Correspondence Management</h1>
          <p className="text-gray-600">Manage correspondence notes for enquiries and students</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('enquiry')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'enquiry'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="h-5 w-5 inline mr-2" />
                Enquiry Correspondence
              </button>
              <button
                onClick={() => setActiveTab('student')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'student'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <GraduationCap className="h-5 w-5 inline mr-2" />
                Student Correspondence
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Levels</option>
                {activeTab === 'enquiry' ? (
                  <>
                    <option value="1">Level 1 - Initial Enquiry</option>
                    <option value="2">Level 2 - Follow-up</option>
                    <option value="3">Level 3 - Serious Interest</option>
                    <option value="4">Level 4 - Documents Submitted</option>
                    <option value="5">Level 5 - Admitted Student</option>
                  </>
                ) : (
                  <option value="5">Level 5 - Admitted Students Only</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header with Count */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              {activeTab === 'enquiry' ? 'Enquiries' : 'Students'} ({totalItems})
            </h3>
            {totalItems > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} records
                {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
              </p>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'enquiry' ? 'Enquiry' : 'Student'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  {activeTab === 'enquiry' && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enquiry Level</th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {totalItems === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'enquiry' ? "4" : "3"} className="px-6 py-12 text-center text-gray-500">
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No {activeTab === 'enquiry' ? 'enquiries' : 'students'} found</p>
                      <p className="text-sm">Try adjusting your search criteria</p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((record) => (
                    <tr key={record._id || record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {record.fullName?.firstName} {record.fullName?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              Father: {record.fatherName || record.fullName?.fatherName || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-1 mb-1">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {record.email || 'Not provided'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {record.phoneNumber || 'Not provided'}
                          </div>
                        </div>
                      </td>
                      {activeTab === 'enquiry' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(record)}`}>
                            {getLevel(record)}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <PermissionGuard permission={activeTab === 'enquiry' ? PERMISSIONS.CORRESPONDENCE.VIEW_ENQUIRY_CORRESPONDENCE : PERMISSIONS.CORRESPONDENCE.VIEW_STUDENT_CORRESPONDENCE}>
                            <button
                              onClick={() => handleViewCorrespondence(record)}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View History
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permission={activeTab === 'enquiry' ? PERMISSIONS.CORRESPONDENCE.ADD_ENQUIRY_CORRESPONDENCE : PERMISSIONS.CORRESPONDENCE.ADD_STUDENT_CORRESPONDENCE}>
                            <button
                              onClick={() => handleAddCorrespondence(record)}
                              className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            >
                              <Plus className="h-4 w-4" />
                              Add Note
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;
                      const isCurrentPage = page === currentPage;
                      
                      // Show first page, last page, current page, and 2 pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                              isCurrentPage
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        (page === currentPage - 2 && currentPage > 3) ||
                        (page === currentPage + 2 && currentPage < totalPages - 2)
                      ) {
                        return (
                          <span key={page} className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Correspondence Modal */}
        {showAddModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">Add {activeTab === 'enquiry' ? 'Enquiry' : 'Student'} Correspondence Note</h3>
                    <p className="text-green-100 mt-1">
                      {selectedRecord.fullName?.firstName} {selectedRecord.fullName?.lastName}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Email:</span>
                      <p className="text-sm text-gray-900">{selectedRecord.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Phone:</span>
                      <p className="text-sm text-gray-900">{selectedRecord.phoneNumber || 'Not provided'}</p>
                    </div>
                    {activeTab === 'enquiry' && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Enquiry Level:</span>
                        <p className="text-sm text-gray-900">{getLevel(selectedRecord)}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-600">Date:</span>
                      <p className="text-sm text-gray-900">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correspondence Note
                  </label>
                  <textarea
                    value={correspondenceNote}
                    onChange={(e) => setCorrespondenceNote(e.target.value)}
                    placeholder={`Enter your note about this ${activeTab === 'enquiry' ? 'enquiry' : 'student'}...`}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={4}
                    disabled={addingCorrespondence}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This note will be saved to the {activeTab === 'enquiry' ? 'enquiry' : 'student'}'s correspondence history.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
                <Button 
                  onClick={handleCloseModal} 
                  variant="outline"
                  disabled={addingCorrespondence}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveCorrespondence}
                  disabled={addingCorrespondence || !correspondenceNote.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {addingCorrespondence ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save Note'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CorrespondenceManagement;
