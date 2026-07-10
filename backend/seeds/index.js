import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Organization from '../src/models/Organization.js';
import User from '../src/models/User.js';
import Job from '../src/models/Job.js';
import Application from '../src/models/Application.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/local-sm';
    console.log('Connecting to database:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB for seeding');

    // 1. Clean existing collections
    await Application.deleteMany({});
    await Job.deleteMany({});
    await User.deleteMany({});
    await Organization.deleteMany({});
    console.log('🧹 Cleaned existing data');

    // 2. Create an Organization
    const org = new Organization({
      name: 'LocalSM Inc.',
      slug: 'localsm-inc',
      email: 'contact@localsm.com',
      phone: '9876543210',
      isActive: true,
      subscription: {
        plan: 'pro'
      }
    });
    await org.save();
    console.log('🏢 Created Organization:', org.name);

    // 3. Create Users
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = new User({
      name: 'System Admin',
      email: 'admin@localsm.com',
      passwordHash: hashedPassword,
      role: 'admin',
      organizationId: org._id,
      isActive: true
    });
    await adminUser.save();

    const candidates = await User.insertMany([
      { name: 'John Doe', email: 'john@example.com', passwordHash: hashedPassword, role: 'employee', organizationId: org._id, isActive: true },
      { name: 'Alice Smith', email: 'alice@example.com', passwordHash: hashedPassword, role: 'employee', organizationId: org._id, isActive: true },
      { name: 'Bob Johnson', email: 'bob@example.com', passwordHash: hashedPassword, role: 'employee', organizationId: org._id, isActive: true },
      { name: 'Emma Watson', email: 'emma@example.com', passwordHash: hashedPassword, role: 'employee', organizationId: org._id, isActive: true },
      { name: 'Sarah Connor', email: 'sarah@example.com', passwordHash: hashedPassword, role: 'employee', organizationId: org._id, isActive: true }
    ]);
    console.log('👤 Created Users with names');

    // 4. Create Jobs
    const jobsData = [
      {
        title: 'Senior Frontend Developer',
        category: 'Web Development',
        description: 'Build premium React & TypeScript applications.',
        location: 'Remote, India',
        salary: '₹18,00,000 - ₹24,00,000',
        experience: '5+ years',
        employmentType: 'full_time',
        skills: ['React', 'TypeScript', 'CSS Modules', 'Vite'],
        openings: 2,
        isOpen: true,
        organizationId: org._id
      },
      {
        title: 'Backend Engineer (Node.js)',
        category: 'Backend Development',
        description: 'Design and build performant Express APIs with MongoDB.',
        location: 'Bangalore, India',
        salary: '₹15,00,000 - ₹20,00,000',
        experience: '3+ years',
        employmentType: 'full_time',
        skills: ['Node.js', 'Express', 'MongoDB', 'Mongoose'],
        openings: 3,
        isOpen: true,
        organizationId: org._id
      },
      {
        title: 'UI/UX Designer',
        category: 'Design',
        description: 'Design clean, modern dashboards and interactive user interfaces.',
        location: 'Remote',
        salary: '₹10,00,000 - ₹14,00,000',
        experience: '2+ years',
        employmentType: 'contract',
        skills: ['Figma', 'UI Design', 'Wireframing'],
        openings: 1,
        isOpen: false, // Closed job
        organizationId: org._id
      },
      {
        title: 'HR Manager',
        category: 'Human Resources',
        description: 'Lead recruitment and employee relationship processes.',
        location: 'Kathmandu, Nepal',
        salary: 'NPR 80,000 - 100,000 / month',
        experience: '4+ years',
        employmentType: 'full_time',
        skills: ['Recruitment', 'Communication', 'HR Policies'],
        openings: 1,
        isOpen: true,
        organizationId: org._id
      }
    ];

    const seededJobs = await Job.insertMany(jobsData);
    console.log(`💼 Seeded ${seededJobs.length} Jobs`);

    // 5. Create Applications
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const applicationsData = [
      {
        userId: candidates[0]._id,
        jobId: seededJobs[0]._id, // Senior Frontend
        resume: 'John_Doe_Frontend_Resume.pdf',
        phone: '+91 9999988888',
        location: 'Delhi, India',
        yearsExperience: '6',
        expectedSalary: '₹22,00,000',
        status: 'HIRED',
        createdAt: new Date(now.getTime() - 10 * day) // 10 days ago (Old applicant)
      },
      {
        userId: candidates[1]._id,
        jobId: seededJobs[0]._id, // Senior Frontend
        resume: 'Alice_Smith_Resume.pdf',
        phone: '+91 9876543219',
        location: 'Mumbai, India',
        yearsExperience: '5',
        expectedSalary: '₹20,00,000',
        status: 'PENDING',
        createdAt: new Date(now.getTime() - 3 * day) // 3 days ago (New applicant)
      },
      {
        userId: candidates[2]._id,
        jobId: seededJobs[1]._id, // Backend Engineer
        resume: 'Bob_Johnson_Resume.pdf',
        phone: '+91 8888877777',
        location: 'Bangalore, India',
        yearsExperience: '3.5',
        expectedSalary: '₹17,00,000',
        status: 'SHORTLISTED',
        createdAt: new Date(now.getTime() - 2 * day) // 2 days ago (New applicant)
      },
      {
        userId: candidates[3]._id,
        jobId: seededJobs[2]._id, // UI UX Designer (Closed job)
        resume: 'Emma_Watson_Portfolio.pdf',
        phone: '+91 7777766666',
        location: 'Remote',
        yearsExperience: '2',
        expectedSalary: '₹12,00,000',
        status: 'REJECTED',
        createdAt: new Date(now.getTime() - 12 * day) // 12 days ago (Old applicant)
      },
      {
        userId: candidates[4]._id,
        jobId: seededJobs[3]._id, // HR Manager
        resume: 'Sarah_Connor_Resume.pdf',
        phone: '+977 9801234567',
        location: 'Kathmandu, Nepal',
        yearsExperience: '4',
        expectedSalary: 'NPR 90,000',
        status: 'REVIEWING',
        createdAt: new Date(now.getTime() - 1 * day) // 1 day ago (New applicant)
      }
    ];

    const seededApps = await Application.insertMany(applicationsData);
    console.log(`📥 Seeded ${seededApps.length} Applications`);

    // Verify calculated KPIs
    const openPositions = seededJobs.filter(j => j.isOpen).length;
    const totalApps = seededApps.length;
    const newApplicants = seededApps.filter(a => now.getTime() - a.createdAt.getTime() < 7 * day).length;
    const hiredCount = seededApps.filter(a => a.status === 'HIRED').length;
    const hiredRate = Math.round((hiredCount / totalApps) * 100);

    console.log('\n--- KPI Check ---');
    console.log('Total Applications:', totalApps);
    console.log('Open Positions (Jobs where isOpen = true):', openPositions);
    console.log('New Applicants (last 7 days):', newApplicants);
    console.log(`Hired Rate: ${hiredRate}% (${hiredCount}/${totalApps})`);
    console.log('-----------------\n');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed. Seeding complete!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
