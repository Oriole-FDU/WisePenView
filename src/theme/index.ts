import type { ThemeConfig } from 'antd';

const appTheme: ThemeConfig = {
  cssVar: {
    prefix: 'ant',
  },
  hashed: false,
  token: {
    colorPrimary: "#314659",
    colorPrimaryBg: "#F0F5F9",
    colorPrimaryBgHover: "#E6F7FF",
    colorSuccess: '#52c41a',
    colorWarning: "#F76B15",
    colorError: "#E5484D",
    colorInfo: "#1677ff",
    colorTextBase: "#11181C",
    colorBgBase: "#ffffff",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    fontFamilyCode: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
    fontSize: 14,
    borderRadius: 6,
    controlHeight: 36,
    colorBgLayout: '#FAFAFA',
    colorBorder: "#E6E8EB",
    colorBorderSecondary: "#F2F4F5",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
    boxShadowSecondary: "0 4px 12px 0 rgba(0, 0, 0, 0.08)",
    wireframe: true
  },
  components: {
    Typography: {
      fontWeightStrong: 600,
      titleMarginBottom: "0.8em",
      titleMarginTop: "1.6em"
    },
    Button: {
      primaryShadow: "none",
      fontWeight: 500,
      contentFontSize: 14
    },
    Input: {
      activeShadow: "0 0 0 2px rgba(49, 70, 89, 0.15)",
      hoverBorderColor: "#314659",
      activeBorderColor: "#314659"
    },
    Card: {
      boxShadowTertiary: "0 1px 0 0 rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(0, 0, 0, 0.06)",
      paddingLG: 24
    },
    Menu: {
      itemHeight: 40,
      borderRadiusLG: 6,
      itemSelectedColor: "#314659",
      itemSelectedBg: "#F0F5F9"
    },
    Tree: {
      titleHeight: 28
    }
  }
};

export default appTheme;