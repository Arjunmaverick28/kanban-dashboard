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
        stage('Build Test') {
            steps {
                sh 'echo "Jenkins successfully checked out the project"'
                sh 'ls -la'
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker build -t kanban-dashboard:latest .'
            }
        }
    }
}
