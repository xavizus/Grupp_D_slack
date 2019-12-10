$(function () {
    var socket = io();

    // when user connects
    socket.on('connect', () => {
        socket.emit('user-connected', roomName, currentUser, socket.id);
    });


    // create chat room input form
    $('#createChatRoom').submit(function (e) {
        // prevents page reloading
        e.preventDefault();

        // sends data about new chat room to server
        socket.emit('create-chat-room', {
            roomname: $('#newRoomName').val(),
            members: []
        });

        socket.on('create-status', (msg) => {
            alert(msg);
        });
    });

    // message input form
    $('#sendMessage').submit(function (e) {
        // prevents page reloading
        e.preventDefault();

        // sends data to server
        socket.emit('chat message', roomName, {
            'userid': currentUser,
            'message': $('#m').val()
        });

        // clears input box
        $('#m').val('');
        return false;
    });

    // receives message from server and prints it in the chat
    socket.on('chat message', function (user, message) {
        $('#messages').append($('<li>').html('<a href="/profile/' + user + '">' + user + '</a> skrev: ' + message));
    });
});
