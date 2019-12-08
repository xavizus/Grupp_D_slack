$(function () {
    var socket = io();

    // message input form
    $('form').submit(function (e) {
        // prevents page reloading
        e.preventDefault();

        // sends data to server
        socket.emit('chat message', {
            'userid': 'testuser',
            'message': $('#m').val()
        });

        // clears input box
        $('#m').val('');
        return false;
    });

    // receives message from server and prints it in the chat
    socket.on('chat message', function (msg) {
        $('#messages').append($('<li>').text(msg));
    });
});
