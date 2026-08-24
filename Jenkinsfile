pipeline {
    agent any

    stages {

        // ============================================================
        // 1. CHECKOUT
        // ============================================================

        stage('Checkout') {
            steps {
                checkout scm
            }
        }


        // ============================================================
        // 2. CREDENTIAL TEST
        // ============================================================

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


        // ============================================================
        // 3. DOCKER BUILD
        // ============================================================

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

                    echo "======================================"
                    echo "Git SHA: ${GIT_SHA}"
                    echo "Build Number: ${BUILD_NUMBER}"
                    echo "Image: ${FULL_IMAGE}"
                    echo "======================================"

                    sh """
                        docker build \
                            -t ${FULL_IMAGE} \
                            .
                    """
                }
            }
        }


        // ============================================================
        // 4. PUSH IMAGE TO DOCKER HUB
        // ============================================================

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
                        set -e

                        echo "$DOCKER_PASSWORD" | docker login \
                            -u "$DOCKER_USERNAME" \
                            --password-stdin

                        echo "Pushing image..."

                        docker push "$FULL_IMAGE"

                        docker logout

                        echo "Image pushed successfully."
                    '''
                }
            }
        }


        // ============================================================
        // 5. DEPLOY NEW VERSION
        // ============================================================

        stage('Deploy New Version') {

            steps {

                script {

                    sh '''
                        set -e

                        echo "======================================"
                        echo "STARTING MINIMAL-DOWNTIME DEPLOYMENT"
                        echo "======================================"


                        echo "Checking existing production container..."

                        if docker ps \
                            --filter "name=kanban-pulled" \
                            --format "{{.Names}}" | \
                            grep -q "^kanban-pulled$"
                        then

                            PREVIOUS_IMAGE=$(docker inspect \
                                --format='{{.Config.Image}}' \
                                kanban-pulled)

                            echo "Previous image:"
                            echo "$PREVIOUS_IMAGE"

                        else

                            PREVIOUS_IMAGE=""

                            echo "No previous container found."

                        fi


                        echo "$PREVIOUS_IMAGE" > previous_image.txt


                        echo "======================================"
                        echo "Pulling new image"
                        echo "======================================"

                        docker pull "$FULL_IMAGE"


                        echo "======================================"
                        echo "Cleaning old temporary container"
                        echo "======================================"

                        docker rm -f kanban-new || true


                        echo "======================================"
                        echo "Starting NEW container"
                        echo "======================================"

                        docker run -d \
                            --name kanban-new \
                            --memory 256m \
                            --cpus 0.5 \
                            -p 4174:80 \
                            "$FULL_IMAGE"


                        echo "New container started."

                        docker ps \
                            --filter "name=kanban-new"


                        echo "======================================"
                        echo "Old production container remains running"
                        echo "Production port: 4173"
                        echo "New container port: 4174"
                        echo "======================================"
                    '''


                    env.PREVIOUS_IMAGE = sh(
                        script: 'cat previous_image.txt',
                        returnStdout: true
                    ).trim()


                    echo "Previous image saved as: ${env.PREVIOUS_IMAGE}"
                }
            }
        }


        // ============================================================
        // 6. HEALTH CHECK NEW CONTAINER
        // ============================================================

        stage('Health Check New Version') {

            steps {

                script {

                    echo "Waiting for new application to start..."

                    sleep 10


                    sh '''
                        set -e


                        echo "======================================"
                        echo "1. CONTAINER STATUS"
                        echo "======================================"


                        STATUS=$(docker inspect \
                            --format='{{.State.Status}}' \
                            kanban-new)


                        echo "Container status: $STATUS"


                        test "$STATUS" = "running"


                        echo "Container is running."


                        echo "======================================"
                        echo "2. DOCKER HEALTHCHECK"
                        echo "======================================"


                        HEALTH_STATUS=$(docker inspect \
                            --format='{{.State.Health.Status}}' \
                            kanban-new)


                        echo "Docker health status: $HEALTH_STATUS"


                        test "$HEALTH_STATUS" = "healthy"


                        echo "Docker HEALTHCHECK passed."


                        echo "======================================"
                        echo "3. APPLICATION ENDPOINT"
                        echo "======================================"


                        HTTP_CODE=$(curl \
                            --silent \
                            --output /dev/null \
                            --write-out "%{http_code}" \
                            http://localhost:4174)


                        echo "HTTP response code: $HTTP_CODE"


                        test "$HTTP_CODE" = "200"


                        echo "Application endpoint check passed."


                        echo "======================================"
                        echo "4. RESOURCE LIMITS"
                        echo "======================================"


                        MEMORY_LIMIT=$(docker inspect \
                            --format='{{.HostConfig.Memory}}' \
                            kanban-new)


                        CPU_LIMIT=$(docker inspect \
                            --format='{{.HostConfig.NanoCpus}}' \
                            kanban-new)


                        echo "Memory limit: $MEMORY_LIMIT bytes"
                        echo "CPU limit: $CPU_LIMIT NanoCPUs"


                        test "$MEMORY_LIMIT" = "268435456"
                        test "$CPU_LIMIT" = "500000000"


                        echo "Resource limits verified."


                        echo "======================================"
                        echo "NEW VERSION HEALTH CHECK PASSED"
                        echo "======================================"
                    '''
                }
            }
        }


        // ============================================================
        // 7. SWITCH TO NEW VERSION
        // ============================================================

        stage('Switch Production Version') {

            steps {

                sh '''
                    set -e


                    echo "======================================"
                    echo "SWITCHING TO NEW VERSION"
                    echo "======================================"


                    echo "Stopping old production container..."

                    docker stop kanban-pulled || true
                    docker rm kanban-pulled || true


                    echo "Stopping temporary new container..."

                    docker stop kanban-new


                    echo "Removing temporary new container..."

                    docker rm kanban-new


                    echo "======================================"
                    echo "Starting NEW VERSION on production port"
                    echo "======================================"


                    docker run -d \
                        --name kanban-pulled \
                        --memory 256m \
                        --cpus 0.5 \
                        -p 4173:80 \
                        "$FULL_IMAGE"


                    echo "New version started on production port 4173."


                    docker ps \
                        --filter "name=kanban-pulled"
                '''
            }
        }


        // ============================================================
        // 8. FINAL PRODUCTION HEALTH CHECK
        // ============================================================

        stage('Final Production Health Check') {

            steps {

                script {

                    echo "Waiting for production application..."

                    sleep 10


                    sh '''
                        set -e


                        echo "======================================"
                        echo "FINAL PRODUCTION VALIDATION"
                        echo "======================================"


                        echo "1. Checking container status..."

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
                        echo "3. Checking production endpoint"
                        echo "======================================"


                        HTTP_CODE=$(curl \
                            --silent \
                            --output /dev/null \
                            --write-out "%{http_code}" \
                            http://localhost:4173)


                        echo "HTTP response code: $HTTP_CODE"


                        test "$HTTP_CODE" = "200"


                        echo "Production endpoint check passed."


                        echo "======================================"
                        echo "4. Checking resource limits"
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


                        echo "Resource limits verified."


                        echo "======================================"
                        echo "ALL PRODUCTION CHECKS PASSED"
                        echo "======================================"
                    '''
                }
            }
        }


        // ============================================================
        // 9. PROMOTE HEALTHY IMAGE TO LATEST
        // ============================================================

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


                        echo "======================================"
                        echo "Promoting healthy image to latest"
                        echo "======================================"


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


    // ================================================================
    // POST ACTIONS
    // ================================================================

    post {

        // ============================================================
        // SUCCESS
        // ============================================================

        success {

            echo "======================================"
            echo "PIPELINE SUCCESSFUL"
            echo "======================================"

            echo "Image: ${FULL_IMAGE}"

            echo "Deployment completed successfully."

            echo "Health checks passed."

            echo "Resource limits verified."

            echo "Latest tag updated."

            echo "======================================"
        }


        // ============================================================
        // FAILURE / ROLLBACK
        // ============================================================

        failure {

            echo "======================================"
            echo "PIPELINE FAILED"
            echo "======================================"

            echo "Starting rollback..."

            echo "Previous image: ${PREVIOUS_IMAGE}"

            echo "======================================"


            sh '''
                set +e


                echo "======================================"
                echo "ROLLBACK STARTED"
                echo "======================================"


                if [ -z "$PREVIOUS_IMAGE" ]; then

                    echo "No previous image available."

                    echo "Rollback cannot be performed."

                    docker rm -f kanban-new || true

                    exit 0

                fi


                echo "Removing failed/new containers..."


                docker stop kanban-new || true
                docker rm kanban-new || true


                docker stop kanban-pulled || true
                docker rm kanban-pulled || true


                echo "======================================"
                echo "Pulling previous image"
                echo "======================================"


                docker pull "$PREVIOUS_IMAGE"


                echo "======================================"
                echo "Starting previous version"
                echo "======================================"


                docker run -d \
                    --name kanban-pulled \
                    --memory 256m \
                    --cpus 0.5 \
                    -p 4173:80 \
                    "$PREVIOUS_IMAGE"


                echo "Previous version started."


                echo "======================================"
                echo "Rollback container status"
                echo "======================================"


                docker ps \
                    --filter "name=kanban-pulled"


                echo "======================================"
                echo "Rollback completed."
                echo "======================================"
            '''
        }
    }
}
