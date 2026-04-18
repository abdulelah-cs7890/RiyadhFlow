import React from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

function ErrorBoundaryFallback({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('map');
  return (
    <div className="map-fallback" role="alert">
      <p>{t('errorFallback')}</p>
      <button
        className="route-btn"
        onClick={onRetry}
        style={{ marginTop: 12, maxWidth: 200 }}
      >
        {t('tryAgain')}
      </button>
    </div>
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <ErrorBoundaryFallback onRetry={this.handleRetry} />
      );
    }
    return this.props.children;
  }
}
