pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Credential Test') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    ),
                    [
                        $class: 'AmazonWebServicesCredentialsBinding',
                        credentialsId: 'aws-creds',
                        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                    ]
                ]) {
                    sh '''
                        echo "Docker Hub credentials are available"
                        echo "AWS credentials are available"

                        test -n "$DOCKER_USERNAME"
                        test -n "$DOCKER_PASSWORD"
                        test -n "$AWS_ACCESS_KEY_ID"
                        test -n "$AWS_SECRET_ACCESS_KEY"

                        echo "Credential binding successful"
                    '''
                }
            }
        }

        stage('Docker Build') {
            steps {
                script {

                    env.GIT_SHA = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = "build-${BUILD_NUMBER}-${GIT_SHA}"

                    env.FULL_IMAGE =
                        "arjunmaverick/kanban-dashboard:${IMAGE_TAG}"

                    echo "Git SHA: ${GIT_SHA}"
                    echo "Build Number: ${BUILD_NUMBER}"
                    echo "Image: ${FULL_IMAGE}"

                    sh """
                        docker build \
                            -t ${FULL_IMAGE} \
                            .

                        docker tag \
                            ${FULL_IMAGE} \
                            arjunmaverick/kanban-dashboard:latest
                    """
                }
            }
        }

        stage('Registry Push') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {
                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login \
                            -u "$DOCKER_USERNAME" \
                            --password-stdin

                        docker push "$FULL_IMAGE"
                        docker push arjunmaverick/kanban-dashboard:latest

                        docker logout
                    '''
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                sh '''
                    set -e

                    echo "Deploying image: $FULL_IMAGE"

                    docker pull "$FULL_IMAGE"

                    docker stop kanban-pulled || true
                    docker rm kanban-pulled || true

                    docker run -d \
                        --name kanban-pulled \
                        -p 4173:80 \
                        "$FULL_IMAGE"

                    echo "New container started"

                    docker ps \
                        --filter "name=kanban-pulled"
                '''
            }
        }

        stage('Health Check') {
            steps {
                script {

                    echo "Waiting for application to start..."

                    sleep 5

                    sh '''
                        set -e

                        echo "Checking container status..."

                        docker inspect \
                            --format='{{.State.Status}}' \
                            kanban-pulled

                        echo "Checking application..."

                        curl --fail \
                            --silent \
                            --show-error \
                            http://localhost:4173

                        echo "Health check successful"
                    '''
                }
            }
        }
    }

    post {

        success {
            echo "Pipeline completed successfully!"
        }

        failure {
            echo "Pipeline failed. Starting rollback..."

            sh '''
                set +e

                echo "Removing failed container..."

                docker stop kanban-pulled || true
                docker rm kanban-pulled || true

                echo "Starting previous stable image..."

                docker pull arjunmaverick/kanban-dashboard:latest

                docker run -d \
                    --name kanban-pulled \
                    -p 4173:80 \
                    arjunmaverick/kanban-dashboard:latest

                echo "Rollback completed"
            '''
        }
    }
}
