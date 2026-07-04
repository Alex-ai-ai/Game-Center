import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

// 捕获 WebGL 上下文创建失败等运行时错误,避免整页白屏。
// 在不支持 WebGL 的环境(如部分沙箱预览)中降级为静态背景,UI 覆盖层仍可交互。
export default class WebGLBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // 仅吞下 WebGL 初始化错误,其他错误继续抛出
    const msg = err instanceof Error ? err.message : String(err);
    if (!/WebGL/i.test(msg)) {
      throw err;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, #2a0d0d 0%, #0a0606 60%, #050404 100%)' }}
        />
      );
    }
    return this.props.children;
  }
}
