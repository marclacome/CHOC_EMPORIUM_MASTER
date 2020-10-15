//whereat_bdi = 0 means NOT IN USA

/*in settings - for testing
0 = no test (use actual location)
1 = force usa
2 = force uk
*/

var whereweat = new function()
{
  this.cval = 1;
  this.collection_handle = '';
  this.timer_handle = null;
  this.init = function(collection_handle, force_override)
  {
    if(force_override == -1) //setting is disable - show the ll usa menu item, show normal hide whereweat on collections & return
    {     
      $('#nav-lindt-lindor-usa-flavours').css('display', 'block');
      $('#normal_display').css('display', 'block');
      $('#whereweat_display').empty();
      $('#whereweat_display').css('display', 'none');
      return;
    }

    this.collection_handle = collection_handle;
    if(force_override == 0 )
    {
      var boop = this.getCookie('whereweat_bdi');
      if (boop == '')
      {
        var self = this;
          geoip2.country(function(obj){
            var d = new Date();
            d.setTime(d.getTime() + (60*60*1000)); //1 hour
            var expires = "expires="+ d.toUTCString()+";";
            self.cval = obj.continent.code.toUpperCase().indexOf('NA')==-1?0:1;
            document.cookie='whereweat_bdi='+self.cval+'; path=/; ' + expires;
            self.showhide();
          },
            function(){           
           	 self.cval = 1;
           	 self.showhide();
          } //geoip failed          
          );
      }
      else
      {
        this.cval = parseInt(boop, 10);
        this.showhide();
      }
    }
    else
    {
      if(force_override == 1) //usa mode
        this.cval = 1;//usa
      else
        this.cval = 0;//uk
        this.showhide();
    }
  }

  this.showhide = function()
  {       
    if(!this.cval) //not in usa
    {
      $('#heroSlider').css('display', 'block');
      $('#normal_display').css('display','block');
      $('#whereweat_display').empty();
      $('#whereweat_display').css('display','none');      
    }
    else
    {      
	  $('#heroSlider').css('display', 'none');      
      $('#whereweat_display').css('display','block');
      $('#normal_display').empty();   
      $('#normal_display').css('display', 'none');      
    }

	  $('#nav-lindt-usa').css('display', this.cval?'none':'block');
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
}
