$(function () {
    var socket = io();

    // when user connects
    socket.emit('user-connected', roomName, 'testuser');

    // create chat room input form
    $('#createChatRoom').submit(function (e) {
        // prevents page reloading
        e.preventDefault();

        // sends data about new chat room to server
        socket.emit('create-chat-room', {
            roomname: $('#newRoomName').val(),
            members: []
        });

        alert('Chat room was created, refresh page');
    });

    // message input form
    $('#sendMessage').submit(function (e) {
        // prevents page reloading
        e.preventDefault();

        // sends data to server
        socket.emit('chat message', roomName, {
            'userid': 'testuser',
            'message': $('#m').val()
        });

        // clears input box
        $('#m').val('');
        return false;
    });

    // receives message from server and prints it in the chat
    socket.on('chat message', function (message) {
        $('#messages').append($('<li>').text(message));
    });
});
