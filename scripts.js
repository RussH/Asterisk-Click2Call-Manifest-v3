function sendNumber(elem){
var phone = elem.innerHTML;
console.log(elem.innerHTML);
document.dispatchEvent(new CustomEvent('sendMessageFromPage', {
        "detail": phone
    }));
}
document.querySelector('body').addEventListener('click', function(evt) {
    if ( evt.target.classList.contains('c2c-link') ) {
	evt.stopPropagation();
	sendNumber(evt.target);
    }
}, true);