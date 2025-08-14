pipeline {
    agent { label 'jagent-03' }

    triggers {
        githubPush()
    }

    environment {
        INFOTECH_DIR = "${env.WORKSPACE}"
        COMPOSE_FILE = 'docker-compose-dev.yml'
        COMPOSE_PROJECT_NAME = 'myapp'
        REQUIRED_FILE = "/jenkins/data/myapp"
    }

    stages {

        stage('Prepare Workspace') {
            steps {
                script {
                    echo "🧹 Cleaning up old deployment artifacts..."
                    sh """
                        rm -rf ${INFOTECH_DIR}/cicd
                        rm -f ${INFOTECH_DIR}/${COMPOSE_FILE}
                    """
                    echo "📦 Copying necessary files to ${INFOTECH_DIR}..."
                    sh """
                        cp -f ${REQUIRED_FILE}/docker-compose.yml ${INFOTECH_DIR}/${COMPOSE_FILE}
                        cp -rf ${REQUIRED_FILE}/cicd ${INFOTECH_DIR}/
                    """
                }
            }
        }

        stage('Inject Environment from Vault') {
                    steps {
                        withVault(
                            configuration: [
                                vaultUrl: 'https://v.nixntronics.in',
                                vaultCredentialId: 'vault-jenkins-cred'
                            ],
                            vaultSecrets: [
                                [
                                    path: 'jenkins/myapp-env',
                                    engineVersion: 2,
                                    secretValues: [
                                        [vaultKey: 'REACT_APP_TARGET_URL', envVar: 'REACT_APP_TARGET_URL'],
                                        [vaultKey: 'REACT_APP_API_KEY', envVar: 'REACT_APP_API_KEY'],
                                        [vaultKey: 'REACT_APP_ENV', envVar: 'REACT_APP_ENV'],
                                        [vaultKey: 'PORT', envVar: 'PORT']
                                    ]
                                ],
                                [
                                    path: 'jenkins/myapp-env-repo',
                                    engineVersion: 2,
                                    secretValues: [
                                        [vaultKey: 'GIT_USERNAME', envVar: 'GIT_USERNAME'],
                                        [vaultKey: 'GIT_TOKEN', envVar: 'GIT_TOKEN'],
                                        [vaultKey: 'GIT_BRANCH', envVar: 'GIT_BRANCH']
                                    ]
                                ]
                            ]
                        ) {
                            script {
                                sh '''#!/bin/sh
                                    echo "REACT_APP_TARGET_URL=$REACT_APP_TARGET_URL" > "$INFOTECH_DIR/cicd/.env"
                                    echo "REACT_APP_API_KEY=$REACT_APP_API_KEY" >> "$INFOTECH_DIR/cicd/.env"
                                    echo "REACT_APP_ENV=$REACT_APP_ENV" >> "$INFOTECH_DIR/cicd/.env"
                                    echo "PORT=$PORT" >> "$INFOTECH_DIR/cicd/.env"
                                    
                                    echo "[INFO] ${INFOTECH_DIR}/cicd/.env files written successfully"
                                    cat ${INFOTECH_DIR}/cicd/.env

                                    echo "GIT_USERNAME=$GIT_USERNAME" > "$INFOTECH_DIR/.env"
                                    echo "GIT_TOKEN=$GIT_TOKEN" >> "$INFOTECH_DIR/.env"
                                    echo "GIT_BRANCH=$GIT_BRANCH" >> "$INFOTECH_DIR/.env"

                                    echo "[INFO] ${INFOTECH_DIR}/cicd/.env files written successfully"
                                    cat ${INFOTECH_DIR}/.env
                                '''
                            }
                        }
                    }
                }
        
        stage('Validate Compose File') {
            steps {
                dir("${INFOTECH_DIR}") {
                    script {
                        if (!fileExists(COMPOSE_FILE)) {
                            sh "ls -la"
                            error "❌ Docker Compose file '${COMPOSE_FILE}' not found in workspace."
                        } else {
                            echo "✅ Compose file located at ${INFOTECH_DIR}/${COMPOSE_FILE}"
                        }
                    }
                }
            }
        }

        stage('Shutdown Existing Containers') {
            steps {
                dir("${INFOTECH_DIR}") {
                    script {
                        echo "📉 Checking for existing Docker Compose containers..."
                        def status = sh(script: "docker compose --env-file .env -f ${COMPOSE_FILE} ps", returnStatus: true)
                        if (status == 0) {
                            echo "🛑 Stopping existing containers and pruning system..."
                            sh """
                                docker compose --env-file .env -f ${COMPOSE_FILE} down
                                docker system prune -af
                            """
                        } else {
                            echo "ℹ️ No running containers found."
                        }
                    }
                }
            }
        }

        stage('Build and Start Containers') {
            steps {
                dir("${INFOTECH_DIR}") {
                    timeout(time: 10, unit: 'MINUTES') {
                        retry(2) {
                            echo "🚀 Building and deploying containers..."
                            sh "docker compose -f ${COMPOSE_FILE} config | grep context"
                            sh "docker compose -p ${COMPOSE_PROJECT_NAME} -f ${COMPOSE_FILE} up -d --build"
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            dir("${INFOTECH_DIR}") {
                script {
                    def causes = currentBuild.getBuildCauses()
                    def triggeredBy = causes[0]?.shortDescription ?: "Unknown"
                    def isManual = triggeredBy.contains('Started by user')

                    def commitHash = sh(script: "git rev-parse --short HEAD", returnStatus: true) == 0 ?
                        sh(script: "git rev-parse --short HEAD", returnStdout: true).trim() : "N/A"
                    def commitAuthor = sh(script: "git log -1 --pretty=format:'%an'", returnStatus: true) == 0 ?
                        sh(script: "git log -1 --pretty=format:'%an'", returnStdout: true).trim() : "N/A"
                    def commitMessage = sh(script: "git log -1 --pretty=format:'%s'", returnStatus: true) == 0 ?
                        sh(script: "git log -1 --pretty=format:'%s'", returnStdout: true).trim() : "No commit message found"

                    emailext (
                        subject: "✅ SUCCESS: ${env.JOB_NAME} [#${env.BUILD_NUMBER}]",
                        body: """
                            <div style="font-family:Arial,sans-serif; padding:20px; background:#f0fff0; border:1px solid #d4edda; border-radius:8px;">
                                <h2 style="color:#155724;">✅ Build Success!</h2>
                                <p><strong>${env.JOB_NAME}</strong> build <strong>#${env.BUILD_NUMBER}</strong> completed successfully.</p>
                                <p><strong>Triggered By:</strong> ${isManual ? 'Manual Trigger' : triggeredBy}</p>
                                <ul>
                                    <li><strong>Commit Hash:</strong> ${commitHash}</li>
                                    <li><strong>Author:</strong> ${commitAuthor}</li>
                                    <li><strong>Message:</strong> ${commitMessage}</li>
                                </ul>
                                <a href="${env.BUILD_URL}" style="padding:10px 20px; background:#28a745; color:white; border-radius:4px; text-decoration:none;">🔍 View Console Output</a>
                            </div>
                        """,
                        mimeType: 'text/html'
                    )
                }
            }
        }

        failure {
            dir("${INFOTECH_DIR}") {
                script {
                    def causes = currentBuild.getBuildCauses()
                    def triggeredBy = causes[0]?.shortDescription ?: "Unknown"
                    def isManual = triggeredBy.contains('Started by user')

                    def commitHash = sh(script: "git rev-parse --short HEAD", returnStatus: true) == 0 ?
                        sh(script: "git rev-parse --short HEAD", returnStdout: true).trim() : "N/A"
                    def commitAuthor = sh(script: "git log -1 --pretty=format:'%an'", returnStatus: true) == 0 ?
                        sh(script: "git log -1 --pretty=format:'%an'", returnStdout: true).trim() : "N/A"
                    def commitMessage = sh(script: "git log -1 --pretty=format:'%s'", returnStatus: true) == 0 ?
                        sh(script: "git log -1 --pretty=format:'%s'", returnStdout: true).trim() : "No commit message found"

                    emailext (
                        subject: "❌ FAILURE: ${env.JOB_NAME} [#${env.BUILD_NUMBER}]",
                        body: """
                            <div style="font-family:Arial,sans-serif; padding:20px; background:#fff5f5; border:1px solid #f5c6cb; border-radius:8px;">
                                <h2 style="color:#721c24;">❌ Build Failed</h2>
                                <p><strong>${env.JOB_NAME}</strong> build <strong>#${env.BUILD_NUMBER}</strong> failed.</p>
                                <p><strong>Triggered By:</strong> ${isManual ? 'Manual Trigger' : triggeredBy}</p>
                                <ul>
                                    <li><strong>Commit Hash:</strong> ${commitHash}</li>
                                    <li><strong>Author:</strong> ${commitAuthor}</li>
                                    <li><strong>Message:</strong> ${commitMessage}</li>
                                </ul>
                                <a href="${env.BUILD_URL}" style="padding:10px 20px; background:#dc3545; color:white; border-radius:4px; text-decoration:none;">🔍 View Console Output</a>
                            </div>
                        """,
                        mimeType: 'text/html'
                    )
                }
            }
        }
    }
}
