import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { App, Button, Card, Form, Input } from "antd";
import { useSetAtom } from "jotai";
import { useAuthControllerLogin } from "@/apis/generated/auth/auth";
import type { LoginDto } from "@/apis/generated/storeWebAPI.schemas";
import { ApiError } from "@/apis/mutator";
import { getToken, tokenAtom } from "@/stores/auth";
import styles from "./login.module.less";

export const Route = createFileRoute("/login")({
  // 已登录还访问 /login 没有意义，直接回首页
  beforeLoad: () => {
    if (getToken()) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setToken = useSetAtom(tokenAtom);
  const login = useAuthControllerLogin();
  const { message } = App.useApp();

  const onFinish = (values: LoginDto) => {
    login.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setToken(data.token);
          void navigate({ to: "/" });
        },
        onError: (err) => {
          void message.error(err instanceof ApiError ? err.message : "登录失败，请稍后重试");
        },
      },
    );
  };

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.title}>数字门店系统</h1>
        <Form<LoginDto> onFinish={onFinish} size="large">
          {/* rules 仅体验层，后端 class-validator 才是权威层（PLAN §5.6 双层校验） */}
          <Form.Item name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input placeholder="用户名" autoFocus />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={login.isPending}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
