if(navigator.userAgent.search('MicroMessenger') !== -1)
	location.href = `https://closed.social/tools/safe_jump/?go=${encodeURIComponent(location.href)}&t=${encodeURIComponent(document.title)}`;
var em = document.getElementById("registration_user_email");
if(!em)
  em = document.getElementById("user_email");
var ap = em.nextSibling;
em.addEventListener("blur", function( event ) {
	if(ap.style.display != 'none' && em.value) {
		em.value+=ap.innerText;
		ap.style.display = 'none';
		alert('注意:清华邮箱收取外部邮件会有至多十分钟的延迟，完成注册后请稍后再查收邮件')
	}
});

