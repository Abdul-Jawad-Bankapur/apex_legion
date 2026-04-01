import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      await updateProfile(result.user, {
        displayName: formData.name
      });

      await sendEmailVerification(result.user);
      
      setVerificationSent(true);
      
    } catch (err: unknown) {
      const errorCode = err instanceof Error ? err.message : '';
      if (errorCode.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else if (errorCode.includes('invalid-email')) {
        setError('Invalid email address.');
      } else if (errorCode.includes('weak-password')) {
        setError('Password is too weak.');
      } else if (errorCode.includes('operation-not-allowed')) {
        setError('Email/password sign-in is not enabled. Please contact admin.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    }
    setLoading(false);
  };

  if (verificationSent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Verify Your Email</h1>
          </div>
          <div className="verification-message">
            <p>We've sent a verification email to <strong>{formData.email}</strong></p>
            <p>Please check your inbox and click the verification link to activate your account.</p>
            <button 
              className="auth-btn primary" 
              onClick={() => {
                setVerificationSent(false);
                setFormData({ name: '', email: '', password: '', confirmPassword: '' });
              }}
            >
              Back to Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>CampusNexus</h1>
          <p>Create your account</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">College Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your.name@college.edu"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="At least 6 characters"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" className="auth-btn primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;