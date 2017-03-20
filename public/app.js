var angApp = angular.module('ExtractionPortal',['ngFileUpload','ngSanitize', 'ngCsv']); 

angApp.factory('globalMessage', function($rootScope) {  
    var clearMsg = function(){
        delete $rootScope.common_error
        delete $rootScope.common_success
    };

    return{
        error: function(msg) {
            clearMsg();
            $rootScope.common_error = msg;
        },
        success: function(msg) {
            clearMsg();
            $rootScope.common_success = msg;
        },
        clear: clearMsg()
    };
}); 