
if (!console || !console.log) {
  var console = {
    log: function() {}
  };
}

// Ugh, globals.
var peerc;
var source = new EventSource("events");
var peerUser;

var constraints = {
   mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
   }
};

var isFirefox = !!navigator.mozGetUserMedia;
var isChrome = !!navigator.webkitGetUserMedia;
var STUN = {
   url: isChrome ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121'
};

var TURN = {
   url: 'turn:numb.viagenie.ca',
   credential: 'muazkh'
};

var iceServers = {
   iceServers: [STUN]
};

if (isChrome) {
   if (parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2]) >= 28)
      TURN = {
         url: 'turn:numb.viagenie.ca',
         credential: 'muazkh',
         username: 'web...@live.com'
      };

   iceServers.iceServers = [STUN, TURN];
}

var options = {
   optional: [
       { DtlsSrtpKeyAgreement: true },
       //{RtpDataChannels: true}
   ]
};


//CAB additions
$(document).ready(function(){connectToHeadset();});


$("#incomingCall").modal();
$("#incomingCall").modal("hide");
 
source.addEventListener("ping", function(e) {}, false);

source.addEventListener("wearstate", function(e) {
  var status = JSON.parse(e.data);
	
  //console.log("status user = " + status.user + " wearstate = " + status.wearstate);
  //check to see if the user is already in the list - if so no need to add
  if(!document.getElementById(status.user + "_status")){
   return;
  }

  document.getElementById(status.user + "_status").innerHTML = status.wearstate;	
}, false);

source.addEventListener("userjoined", function(e) {
  appendUser(e.data);
}, false);

source.addEventListener("userleft", function(e) {
  removeUser(e.data);
}, false);

source.addEventListener("offer", function(e) {
  var offer = JSON.parse(e.data);
  //TODO - CAB is this the right spot?
  //ringHeadset(true, offer);
  document.getElementById("incomingPic").src = "img/" + offer.from.toLowerCase() + ".png";
  document.getElementById("incomingUser").innerHTML = offer.from;
  document.getElementById("incomingAccept").onclick = function() {
    $("#incomingCall").modal("hide");
    //call is being answered via a button click tell the headset to stop ringing
  //  ringHeadset(false, offer);
    acceptCall(offer);
  };
  $("#incomingCall").modal();
  //document.getElementById("incomingRing").play();

}, false);

source.addEventListener("answer", function(e) {
   var answer = JSON.parse(e.data);
   var mozAnswer = new mozRTCSessionDescription(JSON.parse(answer.answer));
  peerc.setRemoteDescription(mozAnswer, function() {
    console.log("Call established!");
  }, error);
}, false);

source.addEventListener("endSession", function(e) {
  var message = JSON.parse(e.data);
  //since the remote-end point ended the session
  // we treat it as not from headset - fair enough
  var params = {
    fromHeadset: false,
    remoteTerm : true
  };
  endCall(params);
}, false);

//TODO: Suhas to enable logs.
function log(info) {
  //var d = document.getElementById("debug");
  //d.innerHTML += info + "\n\n";
}


function appendUser(user) {
	//check to see if the user is already in the list - if so no need to add
	if(document.getElementById(btoa(user) + "_1")){
	   return;
	}
	//check to see if user is the already logged in user - if so no need to add
	if(document.getElementById("user").innerHTML == user){
	   return
	}
  //TODO: replace this clunky code with ejs template
	//select contact list table
  var $table = $('#contactlist');
  var userId = btoa(user);
  var tds = '<tr id= \"' + userId + '_1\">';
  tds += '<td rowspan=\"2\"><img src=\"img/' + user.toLowerCase() + '.png\"></td>';
  tds += '<td> '+user+'<span class=\"available\" id=\"'+ user +'_status\">'+" - Available"+ '</span></td>';
  tds += '</tr>';
  $table.append(tds);
  tds = '<tr id= \"' + userId + '_2\">';
  tds += '<td><button class=\"btn btn-small btn-primary\" type=\"button\" style=\"width:43%;\"';
  tds += 'onclick=\"initiateCall(';
  tds += '\'' + user + '\'';
  tds += ')\";> Call </button></td>';
  tds += '</tr>';
  $table.append(tds);
}

function removeUser(user) {
  //remove the first part of the user - info
  var user_data = btoa(user)+"_1";
  var d = document.getElementById(user_data);
  if (d) {
    $(d).remove();
  }
  //get the 2 part of the user - info
  user_data = btoa(user)+"_2";
  d = document.getElementById(user_data);
  if (d) {
    $(d).remove();
  }
}

var sdp_sent = false;
var offer_global = null;
var answer_global = null;
function send_sdp_to_remote_peer()
{
   if (sdp_sent == false) {
      sdp_sent = true;
     
            jQuery.post(
              "offer", {
                 to: peerUser,
                 from: document.getElementById("user").innerHTML,
                 offer: JSON.stringify(peerc.localDescription)
              },
              function () { console.log("Offer sent!"); }
            ).error(error);
   }
};

// TODO: refactor, this function is almost identical to initiateCall().
function acceptCall(offer) {
  console.log("Incoming call with offer " + offer.from);
  peerUser = offer.from;
  document.getElementById("contentwindow").style.display = "none";
  document.getElementById("videowindow").style.display = "block";

  navigator.mozGetUserMedia({video:true}, function(vs) {
    document.getElementById("localvideo").mozSrcObject = vs;
    document.getElementById("localvideo").play();

    console.log("accept call - getting video is successfull");

    navigator.mozGetUserMedia({audio:true}, function(as) {

      document.getElementById("localaudio").mozSrcObject = as;
      document.getElementById("localaudio").play();

      console.log("accept call - getting audio is successfull");
       //var pc = new mozRTCPeerConnection(iceServers,options);
      var pc = new mozRTCPeerConnection();
      pc.addStream(vs);
      pc.addStream(as);

      pc.onicecandidate = function (evt) {
         console.log("onicecandidate event detected: " + JSON.stringify(evt.candidate));

         if (evt.candidate === null) {
            //   send_sdp_to_remote_peer();
            }
      };

      pc.oniceconnectionstatechange = function (evt) {
         console.log("oniceconnectionstatechange event detected: " + JSON.stringify(evt.candidate));
                  if (pc.iceGatheringState === 'complete') {
           // send_sdp_to_remote_peer();
         }
      };

      pc.onaddstream = function (evt) {
         console.log("Got onaddstream of type " + evt.type);
         if (evt.stream.getVideoTracks().length > 0) {
            console.log("accept call - retrieving remote video");
            document.getElementById("remotevideo").mozSrcObject = evt.stream;
            document.getElementById("remotevideo").play();
         } else {
            console.log("accept call - retrieving remote audio");
            // var device = getPlantronicsHeadset();
            //console.log("device = " + device);
            //if(device){
            //	  document.getElementById("remoteaudio").mozSetup(device.numberOfChannels,device.sampleRate);

            //}
            //else{
            //	  document.getElementById("remoteaudio").mozSetup(1,16000);
            //}

            document.getElementById("remoteaudio").mozSrcObject = evt.stream;
            document.getElementById("remoteaudio").play();
         }
        
      };

       var mozOffer = new mozRTCSessionDescription(JSON.parse(offer.offer));
      //var mozOffer = new mozRTCSessionDescription(offer.offer);

      pc.setRemoteDescription(mozOffer, function() {
         console.log("setRemoteDescription, creating answer");
         peerc = pc;
         pc.createAnswer(function (answer) {
           pc.setLocalDescription(answer, function () {
              // Send answer to remote end.
              console.log("created Answer and setLocalDescription " + JSON.stringify(answer));
              //pc.iceCandidate = new RTCIceCandidate();
              peerc = pc;
              jQuery.post(
                "answer", {
                   to: offer.from,
                   from: offer.to,
                   answer: JSON.stringify(answer)
                },
                function () { console.log("Answer sent!"); }
              ).error(error);
           }, error);
        }, error);
      }, error);
    }, error);
  }, error);
}

function initiateCall(user) {
  peerUser = user;

  console.log("Inside initiate call");
  document.getElementById("contentwindow").style.display = "none";
  document.getElementById("videowindow").style.display = "block";
  
  console.log("Inside initiate call 2");
 // navigator.mediaDevices.getUserMedia({video:true}, function(vs) {
   
   navigator.mozGetUserMedia({video:true}, function(vs) {
    document.getElementById("localvideo").mozSrcObject = vs;
    document.getElementById("localvideo").play();

    console.log("Success in getting local video for the call");
	//navigator.mediaDevices.getUserMedia({audio:true}, function(as) {
    navigator.mozGetUserMedia({audio:true}, function(as) {
      document.getElementById("localaudio").mozSrcObject = as;
      document.getElementById("localaudio").play();

       //var pc = new mozRTCPeerConnection(iceServers, options);
      var pc = new mozRTCPeerConnection();
      pc.addStream(vs);
      pc.addStream(as);

      pc.onicecandidate = function (evt) {
         console.log("onicecandidate event detected: " + JSON.stringify(evt.candidate));

         if (evt.candidate === null) {
            send_sdp_to_remote_peer();
         }
      };

      pc.oniceconnectionstatechange = function (evt) {
         console.log("oniceconnectionstatechange event detected: " + JSON.stringify(evt.candidate));
         if (pc.iceGatheringState === 'complete') {
             send_sdp_to_remote_peer();
         }
      };

      //pc.onicecandidate = function (evt) {
      //   console.log("onicecandidate event detected: " + JSON.stringify(evt.candidate));
      //};
      pc.onaddstream = function(obj) {
        log("Got onaddstream of type " + obj.type);
        if (obj.type == "video") {
          document.getElementById("remotevideo").mozSrcObject = obj.stream;
          document.getElementById("remotevideo").play();
        } else {
          document.getElementById("remoteaudio").mozSrcObject = obj.stream;
          document.getElementById("remoteaudio").play();
        }
      };

      peerc = pc;
      pc.createOffer(function(offer) {
         log("Created offer" + JSON.stringify(offer));
         console.log("Created offer" + JSON.stringify(offer));
        pc.setLocalDescription(offer, function() {
          // Send offer to remote end.
           log("setLocalDescription, sending to remote");
           //pc.iceCandidate = new RTCIceCandidate();
           //console.log(pc.iceCandidate);
          peerc = pc;
          //jQuery.post(
          //  "offer", {
          //    to: user,
          //    from: document.getElementById("user").innerHTML,
          //    offer: JSON.stringify(offer)
          //  },
          //  function() { console.log("Offer sent!"); }
          //).error(error);
        }, error);
      }, error);
    }, error);
  }, error);
}

//CAB - added param to determine if the end call came from a button
// press or a headset event
function endCall(params) {
  var remoteTermRequest = false;
  var termFromHeadset = false;
  log("Ending call");
  if(params) {
    if(params.remoteTerm == true)
        remoteTermRequest = true;
    if(params.fromHeadset == true)
        termFromHeadset = true;
  }

  if( remoteTermRequest == false) {
    //notify the peer to avoid jitter buffer animation
   jQuery.post(
        "endSession", {
          to: peerUser,
          from: document.getElementById("user").innerHTML
          },
       function() { console.log("endSession sent!"); }
      ).error(error);
  }

  //the call was not ended by a headset event - e.g. the user pressed a button
  if(termFromHeadset == false) {
    if(plantronicsSocket ){
       console.log("hanging up headset headset");
      plantronicsSocket.send(JSON.stringify(COMMAND_HANGUP_HEADSET));
     }
  }

  //NOTE: even after we end the session. camera continues to run.
  // Is this a bug ... Suhas to check ..
  document.getElementById("videowindow").style.display = "none";
  document.getElementById("contentwindow").style.display = "block";

  document.getElementById("localvideo").pause();
  document.getElementById("localaudio").pause();
  document.getElementById("remotevideo").pause();
  document.getElementById("remoteaudio").pause();

  document.getElementById("localvideo").src = null;
  document.getElementById("localaudio").src = null;
  document.getElementById("remotevideo").src = null;
  document.getElementById("remoteaudio").src = null;

  peerc = null;
}

function error(e) {
  if (typeof e == typeof {}) {
    alert("Oh no! " + JSON.stringify(e));
  } else {
    alert("Oh no! " + e);
  }
  endCall();
}



