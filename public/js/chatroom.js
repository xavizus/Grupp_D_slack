$(function() {
    var socket = io();

    // when user connects
    socket.on('connect', () => {
        socket.emit('user-connected', roomName, currentUser, socket.id, userId);
    });


    // create chat room input form
    $('#createChatRoom').submit(function(e) {
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
    $('#sendMessage').submit(function(e) {
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
    socket.on('chat message', function(user, message) {
        $('#messages').append($('<li>').html('<a href="/profile/' + user + '">' + user + '</a> skrev: ' + message));
        $('#messages').append($('<hr class="test">'));
        $("#chat-container").scrollTop($("#chat-container")[0].scrollHeight);
    });

    // Update statuses for users
    socket.on('status-change', (userId, status) => {
        console.log(`UserID: ${userId} changed status to: ${status}`);
        let cssStatus = '';
        if (status == 'Online') {
            cssStatus = 'text-success';
        } else {
            cssStatus = 'text-secondary';
        }
        $(`#${userId}`).removeClass();
        $(`#${userId}`).addClass(cssStatus);
    });

});