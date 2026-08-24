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

            env.FULL_IMAGE = "arjunmaverick/kanban-dashboard:${IMAGE_TAG}"

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
    }
}
