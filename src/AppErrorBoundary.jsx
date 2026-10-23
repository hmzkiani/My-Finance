import { Component } from 'react';

export class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[My Finance] A page failed to render.', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return <main className="app-fatal-error" role="alert" aria-labelledby="app-fatal-heading">
      <div className="brand-mark" aria-hidden="true">₨</div>
      <span className="eyebrow">MY FINANCE</span>
      <h1 id="app-fatal-heading">We couldn’t open this page</h1>
      <p>A page error interrupted the app. Reload My Finance to try again.</p>
      <button className="button button-primary" type="button" onClick={() => window.location.reload()}>Reload My Finance</button>
    </main>;
  }
}
