var bdi_once_only_popup = new function()
{
  this.init = function()
  {   
    /*
    this.show_popup();
    return;
    */
    var boop = this.getCookie('bdi_once_only_popup_321');
    if (boop == '')
    {
        var d = new Date();
        d.setTime(d.getTime() + (60*60*1000));
    	var expires = "expires="+ d.toUTCString()+";";
        document.cookie='bdi_once_only_popup_321=ready; path=/; ' + expires;
    }
    else if (boop == 'ready')
		this.show_popup();
  }    
    
  this.getCookie = function(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return "";
	} 
    
   this.create_modal = function()
   {
	 $(".bdi_modal-overlay").fadeTo(500, 0.7);
     $('#bdi_popup').fadeIn($(this).data());
//     $('#bdi_popup_url').html('<p><a href="' + encodeURIComponent('https://thechocolateco.com/collections/chocolate-company-handmade-chocolates') + '">SHOP HANDMADE CHOCOLATES</a>');
     $('#bdi_popup_url').html('<p><a href="' +'https://thechocolateco.com/collections/chocolate-company-handmade-chocolates' + '">SHOP HANDMADE CHOCOLATES</a>');

     $(".bdi_js-modal-close, .bdi_modal-overlay").click(function() {
	  $(".bdi_modal-box, .bdi_modal-overlay").fadeOut(500, function() {
	    $(".bdi_modal-overlay").remove();
	  });
	});
	  
    var self = this;
	$(window).resize(function() {
	  self.set_popup_size();
    //  alert('r');
	});
	$(window).resize();                
   }

   this.set_popup_size = function()
   {
     
     $(".bdi_modal-box").css({
	    top: ($(window).height() - $(".bdi_modal-box").outerHeight()) / 2,
	    left: ($(window).width() - $(".bdi_modal-box").outerWidth()) / 2
	  });
      
     $(".bdi_modal-overlay").css({width:$(document).width(), height:$(document).height()});
   }
  
  
  this.show_popup = function()
  {
    if(false)
    {
      if(0 == 0)
      {
    	document.cookie = 'bdi_once_only_popup_321=done; path=/';
         this.create_modal();
      }
      else
      {
        var d = new Date();
        d.setTime(d.getTime() + (0*24*60*60*1000));
    	var expires = "expires="+ d.toUTCString()+";";
        document.cookie='bdi_once_only_popup_321=done; path=/; ' + expires;
        this.create_modal();
      }
    }
    else
    	document.cookie = 'bdi_once_only_popup_321=; path=/';
  }
}