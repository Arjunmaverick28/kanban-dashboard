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

                        docker logout
                    '''
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                script {

                    sh '''
                        set -e

                        echo "======================================"
                        echo "Checking currently running container"
                        echo "======================================"

                        if docker ps --filter "name=kanban-pulled" \
                            --format "{{.Names}}" | grep -q "^kanban-pulled$"
                        then
                            PREVIOUS_IMAGE=$(docker inspect \
                                --format='{{.Config.Image}}' \
                                kanban-pulled)

                            echo "Previous image: $PREVIOUS_IMAGE"
                        else
                            PREVIOUS_IMAGE=""

                            echo "No previous container found."
                        fi

                        echo "$PREVIOUS_IMAGE" > previous_image.txt

                        echo "Stopping previous container..."

                        docker stop kanban-pulled || true
                        docker rm kanban-pulled || true

                        echo "Pulling new image..."

                        docker pull "$FULL_IMAGE"

                        echo "Starting new container..."

                        docker run -d \
                            --name kanban-pulled \
                            --memory 256m \
                            --cpus 0.5 \
                            -p 4173:80 \
                            "$FULL_IMAGE"

                        echo "New container started."

                        docker ps \
                            --filter "name=kanban-pulled"

                        echo "Resource limits configured:"
                        echo "Memory limit: 256 MB"
                        echo "CPU limit: 0.5 CPU"
                    '''

                    env.PREVIOUS_IMAGE = sh(
                        script: 'cat previous_image.txt',
                        returnStdout: true
                    ).trim()

                    echo "Previous image saved as: ${env.PREVIOUS_IMAGE}"
                }
            }
        }

        stage('Health Check') {
            steps {
                script {

                    echo "Waiting for application to start..."

                    sleep 10

                    sh '''
                        set -e

                        echo "======================================"
                        echo "1. Checking container is running"
                        echo "======================================"

                        STATUS=$(docker inspect \
                            --format='{{.State.Status}}' \
                            kanban-pulled)

                        echo "Container status: $STATUS"

                        test "$STATUS" = "running"

                        echo "Container is running."


                        echo "======================================"
                        echo "2. Checking Docker HEALTHCHECK"
                        echo "======================================"

                        HEALTH_STATUS=$(docker inspect \
                            --format='{{.State.Health.Status}}' \
                            kanban-pulled)

                        echo "Docker health status: $HEALTH_STATUS"

                        test "$HEALTH_STATUS" = "healthy"

                        echo "Docker HEALTHCHECK passed."


                        echo "======================================"
                        echo "3. Checking application endpoint"
                        echo "======================================"

                        HTTP_CODE=$(curl \
                            --silent \
                            --output /dev/null \
                            --write-out "%{http_code}" \
                            http://localhost:4173)

                        echo "HTTP response code: $HTTP_CODE"

                        test "$HTTP_CODE" = "200"

                        echo "Application endpoint check passed."


                        echo "======================================"
                        echo "4. Checking Docker resource limits"
                        echo "======================================"

                        MEMORY_LIMIT=$(docker inspect \
                            --format='{{.HostConfig.Memory}}' \
                            kanban-pulled)

                        CPU_LIMIT=$(docker inspect \
                            --format='{{.HostConfig.NanoCpus}}' \
                            kanban-pulled)

                        echo "Memory limit: $MEMORY_LIMIT bytes"
                        echo "CPU limit: $CPU_LIMIT NanoCPUs"

                        test "$MEMORY_LIMIT" = "268435456"
                        test "$CPU_LIMIT" = "500000000"

                        echo "Docker resource limits verified."


                        echo "======================================"
                        echo "5. Checking actual resource usage"
                        echo "======================================"

                        docker stats \
                            --no-stream \
                            --format "Container: {{.Name}} | CPU: {{.CPUPerc}} | Memory: {{.MemUsage}}" \
                            kanban-pulled


                        echo "======================================"
                        echo "ALL HEALTH CHECKS PASSED"
                        echo "======================================"
                    '''
                }
            }
        }

        stage('Promote Latest') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {
                    sh '''
                        set -e

                        echo "$DOCKER_PASSWORD" | docker login \
                            -u "$DOCKER_USERNAME" \
                            --password-stdin

                        echo "Promoting healthy image to latest..."

                        docker tag \
                            "$FULL_IMAGE" \
                            arjunmaverick/kanban-dashboard:latest

                        docker push \
                            arjunmaverick/kanban-dashboard:latest

                        docker logout

                        echo "Latest tag updated successfully."
                    '''
                }
            }
        }
    }

    post {

        success {
            echo "======================================"
            echo "PIPELINE SUCCESSFUL"
            echo "======================================"
            echo "Image: ${FULL_IMAGE}"
            echo "Memory Limit: 256 MB"
            echo "CPU Limit: 0.5 CPU"
            echo "Health Check: PASSED"
            echo "Latest tag updated."
            echo "======================================"
        }

        failure {
            echo "======================================"
            echo "PIPELINE FAILED"
            echo "Starting rollback..."
            echo "Previous image: ${PREVIOUS_IMAGE}"
            echo "======================================"

            sh '''
                set +e

                if [ -z "$PREVIOUS_IMAGE" ]; then
                    echo "No previous image available."
                    echo "Rollback cannot be performed."
                    exit 0
                fi

                echo "Removing failed container..."

                docker stop kanban-pulled || true
                docker rm kanban-pulled || true

                echo "Pulling previous image..."

                docker pull "$PREVIOUS_IMAGE"

                echo "Starting previous version..."

                docker run -d \
                    --name kanban-pulled \
                    --memory 256m \
                    --cpus 0.5 \
                    -p 4173:80 \
                    "$PREVIOUS_IMAGE"

                echo "Rollback container started."

                docker ps \
                    --filter "name=kanban-pulled"

                echo "Rollback resource limits:"
                echo "Memory limit: 256 MB"
                echo "CPU limit: 0.5 CPU"

                echo "Rollback completed."
            '''
        }
    }
}
