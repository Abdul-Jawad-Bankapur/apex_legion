import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const CompleteProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: user?.displayName || '',
    branch: '',
    semester: '',
    usn: '',
    college: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const branchOptions = [
    'Computer Science & Engineering',
    'Information Science & Engineering',
    'Electronics & Communication',
    'Electrical & Electronics',
    'Mechanical Engineering',
    'Civil Engineering',
    'Artificial Intelligence & Data Science',
    'Electronics & Instrumentation'
  ];

  const semesterOptions = [1, 2, 3, 4, 5, 6, 7, 8];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.branch || !formData.semester || !formData.usn || !formData.college) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      await setDoc(doc(db, 'users', user!.uid), {
        ...formData,
        email: user!.email,
        role: 'student',
        createdAt: serverTimestamp(),
        profileComplete: true
      }, { merge: true });

      navigate('/dashboard');
    } catch (err) {
      console.error("Profile save error:", err);
      setError('Failed to save profile. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Complete Your Profile</h1>
          <p>Please provide your student details</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="usn">USN (University Seat Number)</label>
            <input
              type="text"
              id="usn"
              name="usn"
              value={formData.usn}
              onChange={handleChange}
              required
              placeholder="e.g., 1RN21CS001"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="college">College Name</label>
            <input
              type="text"
              id="college"
              name="college"
              value={formData.college}
              onChange={handleChange}
              required
              placeholder="Enter your college name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="branch">Branch</label>
            <select
              id="branch"
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              required
            >
              <option value="">Select your branch</option>
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="semester">Semester</label>
            <select
              id="semester"
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              required
            >
              <option value="">Select your semester</option>
              {semesterOptions.map((sem) => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="auth-btn primary" disabled={loading}>
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;