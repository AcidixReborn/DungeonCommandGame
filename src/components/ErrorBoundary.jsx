import React from 'react'
import { Container, Alert, Button } from 'react-bootstrap'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('=== REACT ERROR BOUNDARY CAUGHT ERROR ===')
    console.error('Error:', error)
    console.error('Error Info:', errorInfo)
    console.error('Component Stack:', errorInfo.componentStack)

    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container className="mt-5">
          <Alert variant="danger">
            <Alert.Heading>Something went wrong!</Alert.Heading>
            <p>The application encountered an error. Check the console for details.</p>
            {this.state.error && (
              <div className="mt-3">
                <strong>Error:</strong>
                <pre className="bg-dark text-white p-2 rounded">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}
            {this.state.errorInfo && (
              <details className="mt-3">
                <summary>Stack Trace</summary>
                <pre className="bg-dark text-white p-2 rounded mt-2" style={{ fontSize: '0.8em' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <hr />
            <Button variant="primary" onClick={this.handleReset}>
              Reload Application
            </Button>
          </Alert>
        </Container>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
