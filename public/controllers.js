angApp.controller('MainCtrl', function ($scope, $rootScope, $q, $http, Upload, globalMessage) {

    $scope.upldLoader = false;
    $scope.extractionStarted = false;
    $scope.extractionPos = false;
    $scope.allPages = 0;
    $scope.currentIndex = 0;
    $scope.completed = false;
    $scope.urlData = [];

    $scope.clickMe = function(checked){
        if(checked){
            $scope.allPages = 1;
        }else{
            $scope.allPages = 0;
        }
       console.log($scope.allPages);

    };

    $scope.upload = function (file) {
        $scope.upldLoader = true;
        delete $rootScope.common_error;
        delete $rootScope.common_success;
        Upload.upload({
            url: 'upload',
            data: { file: file }
        }).then(function (resp) {
            if (resp.data.status == 200) {
                $scope.urlData = resp.data.data;
            } else {
                globalMessage.error(resp.data.message);
                $scope.upldLoader = false;
            }
        });
    };

    $scope.clear = function () {
        $scope.upldLoader = false;
        $scope.extractionStarted = false;
        $scope.extractionPos = false;
        $scope.currentIndex = 0;
        $scope.completed = false;
        $scope.urlData = [];
    }

    $scope.startExtract = function () {
        $scope.extractionStarted = true;
        $scope.getData()
    }

    $scope.getData = function () {
        var d = { url: $scope.urlData[$scope.currentIndex].url, all_url: $scope.allPages }
        $http.post('/extract', d).then(function (result) {
            var ind = angular.copy($scope.currentIndex);
            $scope.currentIndex = $scope.currentIndex + 1;
            if (result.data.status == 200) {
                $scope.urlData[ind].emails = result.data.data.emails;
                $scope.urlData[ind].phones = result.data.data.phones;
                $scope.urlData[ind].social = result.data.data.social;
            }

            if (($scope.urlData.length > $scope.currentIndex) && !$scope.extractionPos) {                
                $scope.getData()
            }

            if($scope.urlData.length == $scope.currentIndex){
                $scope.completed = true;
            }
        }, function (err) { console.log(err);
            var ind = angular.copy($scope.currentIndex);
            $scope.currentIndex = $scope.currentIndex + 1;
            $scope.urlData[ind].emails = 'faield';
            $scope.urlData[ind].phones = 'faield';
            $scope.urlData[ind].social = 'faield';
            if (($scope.urlData.length > $scope.currentIndex) && !$scope.extractionPos) {                
                $scope.getData()
            }

            if($scope.urlData.length == $scope.currentIndex){
                $scope.completed = true;
            }
        })
    };

    $scope.stopExtract = function () {
        $scope.extractionPos = true;
    }

    $scope.resumeExtract = function () {
        $scope.extractionPos = false;
        $scope.getData();
    }
});
