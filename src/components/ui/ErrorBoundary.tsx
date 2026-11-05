import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/';
    window.location.reload();
  };

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 text-center space-y-4 border-2 border-rose-500/40 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">
                Đã Xảy Ra Sự Cố Hiển Thị
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Ứng dụng vừa gặp một lỗi hiển thị bất ngờ. Dữ liệu của bạn vẫn an toàn trong kho lưu trữ.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-left font-mono text-[11px] text-rose-300 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-2.5 pt-2 justify-center">
              <Button variant="secondary" size="sm" onClick={this.handleReload}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Tải Lại Trang
              </Button>
              <Button variant="primary" size="sm" onClick={this.handleGoHome}>
                <Home className="w-3.5 h-3.5 mr-1" />
                Về Màn Hình Chính
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
