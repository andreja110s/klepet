function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  if (jeSmesko) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    //$('#sporocila').append(divElementEnostavniTekst(sporocilo)); 
    //$('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
    napisiSamoBesede(sporocilo);
    razdeliNaBesedeSlike(sporocilo);
    narediVideo(slike);
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";
var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
    napisiSamoBesede(sporocilo);
    razdeliNaBesedeSlike(sporocilo);
    narediVideo(sporocilo);
    
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
      $('#poslji-sporocilo').val('/zasebno "'+$(this).text()+'"');
      $('#poslji-sporocilo').focus();
    })
    
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}



function razdeliNaBesedeSlike(sporocilo) {
  var besede= sporocilo.split(" ");
  for (var i=0; i<besede.length;  i++) {
    if ((besede[i].startsWith("http") || besede[i].startsWith("https")) && (besede[i].endsWith(".png") || besede[i].endsWith(".jpg") || besede[i].endsWith(".gif"))) {
      $('#sporocila').append(narediSliko(besede[i]));
    }
  }
}

function napisiSamoBesede(sporocilo) {
  var besede= sporocilo.split(" ");
  var izpis="";
  for (var i=0; i<besede.length;  i++) {
    if ((besede[i].startsWith("http") || besede[i].startsWith("https")) && (besede[i].endsWith(".png") || besede[i].endsWith(".jpg") || besede[i].endsWith(".gif"))) {
      besede[i]="";
    }
    else if (besede[i].startsWith("https://www.youtube.com/watch?v=")) {
      besede[i]="";
    }
    else {
     if (i==0) {
       izpis=besede[i];
     }
     else {
       izpis=izpis+" "+besede[i];
     }
    }
  }
  $('#sporocila').append(divElementEnostavniTekst(izpis));
}

function narediSliko(link) {
  var s= "<img src='"+link+ "' width='200' style='margin:20px'/>";
  /*var s= document.createElement(s);
  s.src=link;
  s.width=width;
  s.style.marginLeft=margin;*/
  return s;
}

function narediVideo(link) {
  //var delcek1="https://www.youtube.com/embed/";
  var delcek2=link.substr(32);
  //var celota= delcek1.concat(delcek2);
  var v= "<iframe src='https://www.youtube.com/embed/delcek2'  width='200' height='150'  style='margin:20px' allowfullscreen></iframe>";
  /*var s= document.createElement(s);
  s.src=link;
  s.width=width;
  s.style.marginLeft=margin;*/
  return v;
}