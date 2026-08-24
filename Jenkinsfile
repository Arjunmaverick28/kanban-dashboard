pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Test') {
            steps {
                sh 'echo "Jenkins successfully checked out the project"'
                sh 'ls -la'
            }
        }
    }
}
