import toastr from 'toastr';
import 'toastr/toastr.scss';

toastr.options = {
    "positionClass": "toast-bottom-left",
    "preventDuplicates": true,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": 0,
    "extendedTimeOut": 0,
    "tapToDismiss": true
  };

function log(message) {
    console.log(message);
    toastr.error(message);
};

export default log;