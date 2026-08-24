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

                        echo "Checking currently running container..."

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
                            -p 4173:80 \
                            "$FULL_IMAGE"

                        echo "New container started."

                        docker ps \
                            --filter "name=kanban-pulled"
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

                    sleep 5

                    sh '''
                        set -e

                        echo "Checking container status..."

                        STATUS=$(docker inspect \
                            --format='{{.State.Status}}' \
                            kanban-pulled)

                        echo "Container status: $STATUS"

                        test "$STATUS" = "running"

                        echo "Checking application..."

                        # INTENTIONAL FAILURE FOR ROLLBACK TEST
                        curl --fail \
                            --silent \
                            --show-error \
                            http://localhost:9999

                        echo "Health check successful"
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
            echo "Image: ${FULL_IMAGE}"
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
                    -p 4173:80 \
                    "$PREVIOUS_IMAGE"

                echo "Rollback container started."

                docker ps \
                    --filter "name=kanban-pulled"

                echo "Rollback completed."
            '''
        }
    }
}
