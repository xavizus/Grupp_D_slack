$(function () {
    var socket = io();

    // when user connects
    socket.on('connect', () => {
        socket.emit('user-connected-private', currentUser, socket.id);
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

        alert('Chat room was created, refresh page');
    });

    // message input form
    $('#sendMessage').submit(function (e) {
        // prevents page reloading
        e.preventDefault();

        // sends data to server
        socket.emit('private message', {
            'userid': currentUser,
            'message': $('#m').val()
        });

        // clears input box
        $('#m').val('');
        return false;
    });

    // receives message from server and prints it in the chat
    socket.on('private message', function (user, message) {
        $('#messages').append($('<li>').html('<a href="/profile/' + user + '">' + user + '</a> skrev: ' + message));
    });
});