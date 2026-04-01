import React, { Component } from 'react';

/**
 * ErrorBoundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // Log error to an error reporting service
    console.error('ErrorBoundary đã bắt được lỗi:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, children } = this.props;

    if (hasError) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback(error, errorInfo, this.resetError)
          : fallback;
      }      // Otherwise, render default error UI
      return (
        <div className="container my-5">
          <div className="p-4 rounded shadow-sm bg-light">
            <h2 className="text-danger mb-3">Đã xảy ra lỗi</h2>
            <p className="mb-3">
              Chúng tôi rất tiếc, đã xảy ra lỗi khi hiển thị trang này.
            </p>
            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-4">
                <details className="border rounded p-3">
                  <summary className="fw-bold mb-2">Chi tiết lỗi</summary>
                  <pre className="mt-2 p-3 bg-dark text-white rounded" style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {error?.toString()}
                    {errorInfo?.componentStack}
                  </pre>
                </details>
              </div>
            )}            <button
              className="btn btn-primary mt-3"
              onClick={this.resetError}
            >
              Thử lại
            </button>
          </div>
        </div>
      );
    }

    return children;
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };
}

export default ErrorBoundary; 