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
        string(name: 'BRANCH_NAME', defaultValue: 'main', description: '选择需要构建的 Git 分支')
        choice(name: 'DEPLOY_TARGET', choices: ['oss', 'container', 'none'], description: '部署目标：OSS 静态部署、Nginx 容器部署，或仅构建')
        choice(name: 'BUILD_MODE', choices: ['production', 'development'], description: 'Vite 构建模式')
        booleanParam(name: 'DEPLOY_AFTER_BUILD', defaultValue: true, description: '构建成功后是否执行部署')
        booleanParam(name: 'PUSH_TO_REGISTRY', defaultValue: false, description: '容器构建时是否额外上传镜像到用户指定的制品仓')
        string(name: 'REGISTRY_HOST', defaultValue: '', description: '制品仓主机名和可选端口，不包含协议或路径')
        string(name: 'REGISTRY_NAMESPACE', defaultValue: '', description: '制品仓命名空间，例如 wisepen')
        booleanParam(name: 'RUN_LINT', defaultValue: true, description: '是否执行 pnpm lint')
        choice(name: 'OSS_CLEAN_POLICY', choices: ['keep-previous-release', 'delete-all-stale'], description: 'OSS 清理策略')
        string(name: 'VITE_API_BASE_URL', defaultValue: 'https://api.wisepen.oriole.cn', description: '公网 API 地址')
        string(name: 'VITE_API_BASE_URL_INTRANET', defaultValue: 'https://api.fudan.wisepen.oriole.cn', description: '校内 API 地址')
        string(name: 'VITE_INTRANET_PING_PATH', defaultValue: '/ping', description: '校内 API 探测路径')
        string(name: 'VITE_NETWORK_PROBE_TIMEOUT', defaultValue: '1000', description: '校内 API 探测超时，单位毫秒')
        string(name: 'VITE_DRAWIO_EMBED_URL', defaultValue: 'https://drawio.wisepen.oriole.cn/index.html', description: 'DrawIO 嵌入地址')
        string(name: 'VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL', defaultValue: 'https://office.wisepen.oriole.cn', description: 'ONLYOFFICE Document Server 前端访问地址')
        booleanParam(name: 'ENABLE_OTEL', defaultValue: false, description: '是否启用前端 OTel，入口自动使用 API 地址下的 /otel')

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
                script {
                    def remoteUrl = scm.userRemoteConfigs[0].url
                    echo "开始从 ${remoteUrl} 拉取 ${params.BRANCH_NAME} 分支代码..."
                    deleteDir()
                    git branch: params.BRANCH_NAME, url: remoteUrl
                    env.GIT_COMMIT_FULL = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    sh 'git status --short --branch'
                    echo "代码拉取成功，Commit: ${env.GIT_COMMIT_FULL}"
                }
            }
        }

        stage('2. 准备构建 (Prepare)') {
            steps {
                script {
                    if (params.PUSH_TO_REGISTRY && params.DEPLOY_TARGET != 'container') {
                        error '只有容器构建可以上传 Docker/OCI 制品仓。'
                    }
                    if (params.PUSH_TO_REGISTRY && (!params.REGISTRY_HOST?.trim() || params.REGISTRY_HOST.contains('://') || params.REGISTRY_HOST.contains('/'))) {
                        error 'REGISTRY_HOST 必须填写主机名和可选端口，不能包含协议或路径。'
                    }
                    if (params.PUSH_TO_REGISTRY && !params.REGISTRY_NAMESPACE?.trim()) {
                        error '启用制品仓上传时必须填写 REGISTRY_NAMESPACE。'
                    }
                }
                sh '''
                set -eu
                node -v
                node -e '
                  const [major, minor, patch] = process.versions.node.split(".").map(Number);
                  const ok = major === 22 && (minor > 23 || (minor === 23 && patch >= 2));
                  if (!ok) {
                    throw new Error(`Jenkins NodeJS 工具必须使用 Node.js >=22.23.2 <23，当前为 ${process.versions.node}`);
                  }
                '

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

                case "${BUILD_MODE}" in
                  production|development) ;;
                  *) echo "不支持的 BUILD_MODE: ${BUILD_MODE}"; exit 1 ;;
                esac
                case "${ENABLE_OTEL}" in
                  true) VITE_OTEL_ENDPOINT="${VITE_API_BASE_URL%/}/otel" ;;
                  false) VITE_OTEL_ENDPOINT= ;;
                  *) echo "ENABLE_OTEL 必须是 true 或 false：${ENABLE_OTEL}"; exit 1 ;;
                esac
                TARGET_ENV_FILE=".env.${BUILD_MODE}"
                cat > "${TARGET_ENV_FILE}" <<EOF
VITE_API_BASE_URL=${VITE_API_BASE_URL}
VITE_API_BASE_URL_INTRANET=${VITE_API_BASE_URL_INTRANET}
VITE_INTRANET_PING_PATH=${VITE_INTRANET_PING_PATH}
VITE_NETWORK_PROBE_TIMEOUT=${VITE_NETWORK_PROBE_TIMEOUT}
VITE_DRAWIO_EMBED_URL=${VITE_DRAWIO_EMBED_URL}
VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL=${VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL}
VITE_OTEL_ENDPOINT=${VITE_OTEL_ENDPOINT}
VITE_X_DEVELOPER=
EOF
                '''
            }
        }

        stage('3. 安装依赖 (Install Dependencies)') {
            steps {
                sh 'pnpm install --frozen-lockfile'
            }
        }

        stage('4. 构建前端 (Build)') {
            steps {
                script {
                    if (params.RUN_LINT) {
                        sh 'pnpm lint'
                    } else {
                        echo '跳过静态校验：RUN_LINT=false'
                    }
                    if (params.BUILD_MODE == 'production') {
                        sh 'pnpm build'
                    } else {
                        sh 'pnpm build:dev'
                    }
                }
            }
        }

        stage('5. 生成发布制品 (Package)') {
            steps {
                sh '''
                set -eu
                node scripts/jenkins/create-release-manifest.mjs \
                  --dist dist \
                  --out "${RELEASE_MANIFEST}" \
                  --build-mode "${BUILD_MODE}"
                '''
                script {
                    env.IMAGE_TAG = sh(
                        script: 'node -p "JSON.parse(require(\'fs\').readFileSync(\'dist/build-info.json\', \'utf8\')).release"',
                        returnStdout: true
                    ).trim()
                }
                archiveArtifacts artifacts: 'dist/**,.wisepen-release-manifest.json', fingerprint: false

                sh '''
                set -eu
                test -s ".wisepen-debug/${IMAGE_TAG}/manifest.json"
                tar -czf .wisepen-debug-artifacts.tar.gz -C .wisepen-debug "${IMAGE_TAG}"
                '''
                archiveArtifacts artifacts: '.wisepen-debug-artifacts.tar.gz', fingerprint: true

                script {
                    if (params.DEPLOY_TARGET == 'container') {
                        sh '''
                        set -eu
                        docker build \
                          -t "${DOCKER_REGISTRY}/${PROJECT_NAME}:${IMAGE_TAG}" \
                          -f Dockerfile .
                        '''
                    } else {
                        echo "跳过容器镜像构建：DEPLOY_TARGET=${params.DEPLOY_TARGET}"
                    }
                }
            }
        }

        stage('5.5 上传镜像到制品仓 (Push Registry)') {
            when {
                expression { return params.PUSH_TO_REGISTRY }
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'docker-registry-credentials',
                        usernameVariable: 'REGISTRY_USERNAME',
                        passwordVariable: 'REGISTRY_PASSWORD'
                    )
                ]) {
                    withEnv([
                        "REGISTRY_HOST=${params.REGISTRY_HOST.trim()}",
                        "REGISTRY_NAMESPACE=${params.REGISTRY_NAMESPACE.trim()}"
                    ]) {
                        sh '''
                        set -eu
                        DOCKER_CONFIG="$(mktemp -d)"
                        export DOCKER_CONFIG
                        trap 'rm -rf "$DOCKER_CONFIG"' EXIT
                        printf '%s' "$REGISTRY_PASSWORD" | docker login "$REGISTRY_HOST" \
                            --username "$REGISTRY_USERNAME" --password-stdin
                        source_image="${DOCKER_REGISTRY}/${PROJECT_NAME}:${IMAGE_TAG}"
                        target_image="${REGISTRY_HOST}/${REGISTRY_NAMESPACE}/${PROJECT_NAME}:${IMAGE_TAG}"
                        docker tag "$source_image" "$target_image"
                        docker push "$target_image"
                        '''
                    }
                }
            }
        }

        stage('6. 部署 (Deploy)') {
            steps {
                script {
                    if (params.DEPLOY_AFTER_BUILD && params.DEPLOY_TARGET == 'container') {
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

                        # 清理规范容器
                        docker rm -f wisepen-view >/dev/null 2>&1 || true

                        export APP_VERSION="${IMAGE_TAG}"
                        export DOCKER_REGISTRY="${DOCKER_REGISTRY}"
                        export FRONTEND_PORT="${FRONTEND_PORT}"
                        docker-compose version
                        docker-compose \
                          -p wisepen-view \
                          -f "${COMPOSE_FILE_PATH}" \
                          up -d --no-build --force-recreate --remove-orphans frontend
                        '''
                    } else if (params.DEPLOY_AFTER_BUILD && params.DEPLOY_TARGET == 'oss') {
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
                    } else if (!params.DEPLOY_AFTER_BUILD) {
                        echo '跳过部署：DEPLOY_AFTER_BUILD=false'
                    } else {
                        echo "跳过部署：DEPLOY_TARGET=${params.DEPLOY_TARGET}"
                    }
                }
            }
        }
    }

    post {
        success {
            script {
                def deployed = params.DEPLOY_AFTER_BUILD && params.DEPLOY_TARGET != 'none'
                echo(deployed
                    ? "构建与部署完成！版本: ${IMAGE_TAG}"
                    : "构建完成，已跳过部署！版本: ${IMAGE_TAG}")
            }
        }
        failure {
            echo '流水线执行失败，请检查 Jenkins Console Output。'
        }
    }
}
