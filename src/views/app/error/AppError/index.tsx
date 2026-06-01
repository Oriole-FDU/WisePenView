import { Collapse, Result, Space, Tooltip, Typography } from 'antd';
import { RiFileCopyLine } from 'react-icons/ri';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';

import LandingNavbar from '@/components/LandingNavbar';
import ResourceNotFound from '@/views/app/error/ResourceNotFound';
import { Button, toast } from '@heroui/react';
import styles from './style.module.less';

interface AppErrorInfo {
  status: 'error' | 'warning' | '404' | '403' | '500' | 'success' | 'info';
  title: string;
  subTitle: string;
  detail?: string;
}

const buildAppErrorInfo = (error: unknown): AppErrorInfo => {
  if (isRouteErrorResponse(error)) {
    const title = error.status >= 500 ? '出错啦' : `请求异常 (${error.status})`;
    const subTitle = error.statusText || '页面加载失败，请稍后重试。';
    const detail =
      typeof error.data === 'string'
        ? error.data
        : error.data && typeof error.data === 'object'
          ? JSON.stringify(error.data)
          : undefined;

    return {
      status: error.status >= 500 ? '500' : 'warning',
      title,
      subTitle,
      detail,
    };
  }

  if (error instanceof Error) {
    return {
      status: '500',
      title: '出错啦',
      subTitle: '页面发生了意外错误，请刷新后重试。',
      detail: error.message,
    };
  }

  return {
    status: '500',
    title: '出错啦',
    subTitle: '发生了未知错误，请稍后再试。',
  };
};

function AppError() {
  const navigate = useNavigate();
  const error = useRouteError();
  // 路由未命中抛出的 404 走专用 ResourceNotFound 页，避免通用错误壳与业务 404 语义混淆
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ResourceNotFound />;
  }

  const errorInfo = buildAppErrorInfo(error);
  const hasErrorDetail = Boolean(errorInfo.detail);

  const handleCopyDetail = async () => {
    if (!errorInfo.detail) {
      return;
    }

    try {
      await navigator.clipboard.writeText(errorInfo.detail);
      toast.success('错误详情已复制');
    } catch {
      toast.danger('复制失败，请手动复制');
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.navShell}>
        <LandingNavbar />
      </div>

      <main className={styles.main}>
        <Result
          className={styles.result}
          status={errorInfo.status}
          title={errorInfo.title}
          subTitle={errorInfo.subTitle}
          extra={
            <Space size="middle" wrap>
              <Button variant="primary" size="lg" onPress={() => window.location.reload()}>
                刷新页面
              </Button>
              <Button size="lg" onPress={() => navigate(-1)}>
                返回上一页
              </Button>
            </Space>
          }
        >
          {hasErrorDetail ? (
            <Collapse
              className={styles.errorCollapse}
              bordered={false}
              items={[
                {
                  key: 'error-detail',
                  label: <Typography.Text type="secondary">查看错误详情</Typography.Text>,
                  extra: (
                    <span onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="复制错误详情">
                        <Button variant="ghost" size="sm" isIconOnly onPress={handleCopyDetail}>
                          <RiFileCopyLine />
                        </Button>
                      </Tooltip>
                    </span>
                  ),
                  children: (
                    <div className={styles.errorDetailPanel}>
                      <Typography.Paragraph className={styles.errorDetail}>
                        {errorInfo.detail}
                      </Typography.Paragraph>
                      <Typography.Text type="secondary" className={styles.contactTip}>
                        如问题持续，请复制错误详情并联系开发者
                      </Typography.Text>
                    </div>
                  ),
                },
              ]}
            />
          ) : null}
        </Result>
      </main>

      <footer className={styles.footerMini}>WisePen · 学术英语写作平台</footer>
    </div>
  );
}

export default AppError;
