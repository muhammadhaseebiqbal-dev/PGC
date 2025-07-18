const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const QualificationSchema = new mongoose.Schema({
  degree: String,
  institution: String,
  year: String,
  grade: String
}, { _id: false });

const ExperienceSchema = new mongoose.Schema({
  title: String,
  organization: String,
  from: String,
  to: String,
  description: String
}, { _id: false });

const FamilyInfoSchema = new mongoose.Schema({
  fatherName: String,
  fatherOccupation: String,
  fatherOccupationLocation: String,
  kinship: String,
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  }
}, { _id: false });

const AcademicRecordSchema = new mongoose.Schema({
  matricMarks: String,
  matricRollNo: String,
  matricYear: String,
  matricBoard: String,
  firstYearMarks: String,
  secondYearMarks: String
}, { _id: false });

const UserSchema = new mongoose.Schema({
  // Core Identity Fields
  userName: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true }
  },
  role: { type: String, required: true }, // e.g., 'SystemAdmin', 'Teacher', etc.
  roleId: { type: String }, // for legacy mapping if needed
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
  status: { type: Number, default: 1 }, // 1=Active, 2=Paused, 3=Deleted

  // Contact Information
  phoneNumber: String,
  phoneNumber2: String,
  phoneNumber3: String,
  secondaryPhone: String,  // Added for new form structure
  mobileNumber: String,    // Added for student mobile number
  phoneNumbers: {          // Added for structured phone numbers
    primary: String,
    secondary: String
  },
  address: String,
  reference: String,       // Added for reference person
  
  // Academic Background
  previousSchool: String,  // Added for previous school/college
  oldSchoolName: String,   // Alternative field name for previous school
  program: String,         // Added for student program (ICS, ICOM, Pre Engineering, Pre Medical)
  
  // Matriculation Details
  matriculationObtainedMarks: Number,  // Marks obtained in matriculation
  matriculationTotalMarks: Number,     // Total marks in matriculation
  
  // Personal Information
  gender: String,
  dob: Date,
  cnic: String,
  fatherName: String,      // Added for student father name
  imageUrl: String,

  // System Fields
  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
  deletedAt: { type: Date }, // Added for soft delete
  lastPasswordChangedOn: Date,
  cookieId: String,
  newLoginOTP: String,

  // Academic/Professional/Role-Specific Fields
  // For Students
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  previousClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  society: String,
  academicRecords: AcademicRecordSchema,
  sessionActiveYear: String,
  inquiryLevel: String,
  prospectusStage: { type: Number, default: 1 }, // 1-6 for inquiry/prospectus stages
  boardRegistration: String,
  isEnrolledPreClasses: Boolean,
  isPassedOut: Boolean,
  struckOffCount: Number,
  redNoticeCount: Number,
  biometricId: String,
  
  // Enquiry Progression Tracking Fields
  prospectusPurchasedOn: Date,
  prospectusReturnedOn: Date,
  afSubmittedOn: Date,
  installmentSubmittedOn: Date,
  isProcessed: { type: Boolean, default: false },
  processedYear: String,

  // For Staff/Teachers
  specializedIn: String,
  duties: String,
  isClassIncharge: Boolean,
  qualifications: [QualificationSchema],
  experiences: [ExperienceSchema],
  applicantInfo: String,
  allowances: [String],
  roleResponsibilities: [String],

  // Family Info (for all roles)
  familyInfo: FamilyInfoSchema,

  // Attendance (relationship)
  attendance: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],

  // Receptionist Remarks
  receptionistRemarks: [{
    remark: { type: String, required: true },
    receptionistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receptionistName: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],

  // Misc
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  isSuspended: { type: Boolean, default: false }
});

// Password hashing pre-save hook
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for accountStatus
UserSchema.virtual('accountStatus').get(function() {
  if (this.status === 1 && this.isActive && this.isApproved) return 'Active';
  if (this.status === 2 || this.isSuspended || this.isActive === false) return 'Paused';
  return 'Pending';
});

module.exports = mongoose.model('User', UserSchema);
