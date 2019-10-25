var em = document.getElementById("registration_user_email");
if(!em)
  em = document.getElementById("user_email");
var ap = em.nextSibling;
em.addEventListener("blur", function( event ) {
	if(ap.style.display != 'none' && em.value) {
		em.value+=ap.innerText;
		ap.style.display = 'none';
	}
});

