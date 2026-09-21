pipeline {
    agent any

    tools {
        nodejs 'NodeJS'
    }

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
    }

    parameters {
        choice(name: 'DEPLOY_TARGET', choices: ['oss', 'container', 'none'], description: '部署目标：OSS 静态部署、Nginx 容器部署，或仅构建')
        choice(name: 'BUILD_MODE', choices: ['production', 'development'], description: 'Vite 构建模式')
        booleanParam(name: 'DEPLOY_AFTER_BUILD', defaultValue: true, description: '构建成功后是否执行部署')
        booleanParam(name: 'RUN_LINT', defaultValue: true, description: '是否执行 pnpm lint')
        choice(name: 'OSS_CLEAN_POLICY', choices: ['keep-previous-release', 'delete-all-stale'], description: 'OSS 清理策略')
        string(name: 'VITE_API_BASE_URL', defaultValue: 'https://api.wisepen.oriole.cn', description: '公网 API 地址')
        string(name: 'VITE_API_BASE_URL_INTRANET', defaultValue: 'https://api.fudan.wisepen.oriole.cn', description: '校内 API 地址')
        string(name: 'VITE_INTRANET_PING_PATH', defaultValue: '/ping', description: '校内 API 探测路径')
        string(name: 'VITE_NETWORK_PROBE_TIMEOUT', defaultValue: '1000', description: '校内 API 探测超时，单位毫秒')
        string(name: 'VITE_DRAWIO_EMBED_URL', defaultValue: 'https://drawio.wisepen.oriole.cn/index.html', description: 'DrawIO 嵌入地址')
        string(name: 'VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL', defaultValue: 'https://office.wisepen.oriole.cn', description: 'ONLYOFFICE Document Server 前端访问地址')

        string(name: 'OSS_ENDPOINT', defaultValue: '', description: '阿里云 OSS Endpoint，例如 oss-cn-shanghai.aliyuncs.com')
        string(name: 'OSS_BUCKET', defaultValue: '', description: '阿里云 OSS Bucket 名称')
    }

    environment {
        CI = 'true'
        PROJECT_NAME = 'wisepenview'
        DOCKER_REGISTRY = 'local'
        COMPOSE_FILE_PATH = 'docker-compose-app.yml'
        RELEASE_MANIFEST = '.wisepen-release-manifest.json'
        FRONTEND_PORT = '8085'
    }

    stages {
        stage('1. 拉取代码 (Checkout)') {
            steps {
                checkout scm
            }
        }

        stage('1.5 确认构建版本 (Resolve Version)') {
            steps {
                script {
                    env.IMAGE_TAG = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    echo "当前构建版本 TAG: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('2. 检查 Node 环境 (Check Environment)') {
            steps {
                sh '''
                set -eu
                whoami
                pwd
                node -v
                npm -v
                corepack --version || true
                node -e '
                  const [major, minor, patch] = process.versions.node.split(".").map(Number);
                  const ok = major === 22 && (minor > 23 || (minor === 23 && patch >= 2));
                  if (!ok) {
                    throw new Error(`Jenkins NodeJS 工具必须使用 Node.js >=22.23.2 <23，当前为 ${process.versions.node}`);
                  }
                '
                '''
            }
        }

        stage('3. 准备 pnpm (Prepare pnpm)') {
            steps {
                sh '''
                set -eu
                PNPM_SPEC="$(node -p "require('./package.json').packageManager || ''")"
                case "${PNPM_SPEC}" in
                  pnpm@*) ;;
                  *) echo "package.json 缺少有效的 packageManager: pnpm@x.y.z"; exit 1 ;;
                esac

                if command -v corepack >/dev/null 2>&1; then
                  corepack enable
                  corepack prepare "${PNPM_SPEC}" --activate
                else
                  npm install --global "${PNPM_SPEC}"
                fi

                EXPECTED_VERSION="${PNPM_SPEC#pnpm@}"
                ACTUAL_VERSION="$(pnpm --version)"
                test "${ACTUAL_VERSION}" = "${EXPECTED_VERSION}" || {
                  echo "pnpm 版本不一致：期望 ${EXPECTED_VERSION}，实际 ${ACTUAL_VERSION}"
                  exit 1
                }
                echo "使用 pnpm ${ACTUAL_VERSION}"
                '''
            }
        }

        stage('4. 生成构建环境配置 (Generate Env)') {
            steps {
                sh '''
                set -eu
                case "${BUILD_MODE}" in
                  production|development) ;;
                  *) echo "不支持的 BUILD_MODE: ${BUILD_MODE}"; exit 1 ;;
                esac

                TARGET_ENV_FILE=".env.${BUILD_MODE}"
                cat > "${TARGET_ENV_FILE}" <<EOF
VITE_API_BASE_URL=${VITE_API_BASE_URL}
VITE_API_BASE_URL_INTRANET=${VITE_API_BASE_URL_INTRANET}
VITE_INTRANET_PING_PATH=${VITE_INTRANET_PING_PATH}
VITE_NETWORK_PROBE_TIMEOUT=${VITE_NETWORK_PROBE_TIMEOUT}
VITE_DRAWIO_EMBED_URL=${VITE_DRAWIO_EMBED_URL}
VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL=${VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL}
VITE_X_DEVELOPER=
EOF

                echo "${TARGET_ENV_FILE} 已生成："
                sed -n '1,8p' "${TARGET_ENV_FILE}"
                '''
            }
        }

        stage('5. 安装依赖 (Install Dependencies)') {
            steps {
                sh 'pnpm install --frozen-lockfile'
            }
        }

        stage('6. 静态校验 (Verify)') {
            when {
                expression { return params.RUN_LINT }
            }
            steps {
                sh 'pnpm lint'
            }
        }

        stage('7. 构建前端产物 (Build Dist)') {
            steps {
                script {
                    if (params.BUILD_MODE == 'production') {
                        sh 'pnpm build'
                    } else {
                        sh 'pnpm build:dev'
                    }
                }
            }
        }

        stage('8. 生成发布清单 (Create Release Manifest)') {
            steps {
                sh '''
                set -eu
                node scripts/jenkins/create-release-manifest.mjs \
                  --dist dist \
                  --out "${RELEASE_MANIFEST}" \
                  --release "${IMAGE_TAG}" \
                  --build-mode "${BUILD_MODE}"
                '''
                archiveArtifacts artifacts: 'dist/**,.wisepen-release-manifest.json', fingerprint: false
            }
        }

        stage('9A. 构建前端容器镜像 (Docker Build)') {
            when {
                expression { return params.DEPLOY_AFTER_BUILD && params.DEPLOY_TARGET == 'container' }
            }
            steps {
                sh '''
                set -eu
                docker build \
                  -t "${DOCKER_REGISTRY}/${PROJECT_NAME}:${IMAGE_TAG}" \
                  -f Dockerfile .
                '''
            }
        }

        stage('9B. 容器部署 (Deploy Container)') {
            when {
                expression { return params.DEPLOY_AFTER_BUILD && params.DEPLOY_TARGET == 'container' }
            }
            steps {
                sh '''
                set -eu
                case "${FRONTEND_PORT}" in
                  ''|*[!0-9]*) echo "FRONTEND_PORT 必须是数字：${FRONTEND_PORT}"; exit 1 ;;
                esac

                # 允许已有的 wisepen-view 在后续发布中被 Compose 替换，
                # 但不自动删除任何其它占用 8085 的容器。
                PORT_CONFLICTS="$(docker ps \
                  --filter "publish=${FRONTEND_PORT}" \
                  --format '{{.Names}}' \
                  | grep -v '^wisepen-view$' || true)"
                if [ -n "${PORT_CONFLICTS}" ]; then
                    echo "宿主机端口 ${FRONTEND_PORT} 已被其它容器占用："
                    echo "${PORT_CONFLICTS}"
                    echo "请先手动停止并删除冲突容器，Jenkins 不会自动处理。"
                    exit 1
                fi

                export APP_VERSION="${IMAGE_TAG}"
                export DOCKER_REGISTRY="${DOCKER_REGISTRY}"
                export FRONTEND_PORT="${FRONTEND_PORT}"
                docker-compose -f "${COMPOSE_FILE_PATH}" up -d --no-build --remove-orphans frontend
                '''
            }
        }

        stage('9C. OSS 静态部署 (Deploy OSS)') {
            when {
                expression { return params.DEPLOY_AFTER_BUILD && params.DEPLOY_TARGET == 'oss' }
            }
            steps {
                script {
                    if (!params.OSS_ENDPOINT?.trim()) {
                        error('OSS_ENDPOINT 为空。请填写阿里云 OSS Endpoint。')
                    }
                    if (!params.OSS_BUCKET?.trim()) {
                        error('OSS_BUCKET 为空。请填写阿里云 OSS Bucket 名称。')
                    }

                    withCredentials([
                        string(credentialsId: 'aliyun-oss-access-key-id', variable: 'ALIYUN_ACCESS_KEY_ID'),
                        string(credentialsId: 'aliyun-oss-access-key-secret', variable: 'ALIYUN_ACCESS_KEY_SECRET')
                    ]) {
                        sh '''
                        set -eu
                        test -n "${ALIYUN_ACCESS_KEY_ID}" || {
                            echo "Jenkins credential aliyun-oss-access-key-id 为空，请管理员检查配置。"
                            exit 1
                        }
                        test -n "${ALIYUN_ACCESS_KEY_SECRET}" || {
                            echo "Jenkins credential aliyun-oss-access-key-secret 为空，请管理员检查配置。"
                            exit 1
                        }
                        node scripts/jenkins/deploy-oss-release.mjs
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo "WisePenView 流水线执行成功，版本: ${IMAGE_TAG}"
        }
        failure {
            echo 'WisePenView 流水线执行失败，请检查 Console Output。'
        }
    }
}
