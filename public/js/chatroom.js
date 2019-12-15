$(function () {
    var socket = io();

    // when user connects
    socket.on('connect', () => {
        socket.emit('user-connected', roomName, currentUser, socket.id, userId);
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
    socket.on('chat message', function (user, message, messageID) {
        let messageBox = $('<li>', {
            id: messageID
        });

        let usernameLink = $('<a>', {
            href: '/profile/' + user,
            text: user
        });

        let chatMessage = $('<div>', {
            text: message
        });

        let editButton = $('<button>', {
            text: 'Edit',
            class: 'edit-buttons'
        });
        editButton.on('click', (event) => {
            let messageDiv = event.currentTarget.previousSibling.previousSibling;
            let oldMessage = messageDiv.innerHTML;

            let editArea = $('<textarea>', {
                html: oldMessage
            });

            let saveButton = $('<button>', {
                text: 'Save'
            });
            saveButton.on('click', (event) => {
                socket.emit('edit-message', editArea.val(), event.currentTarget.parentNode.parentNode.id);

                $(messageDiv).html(editArea.val());
            });

            let closeButton = $('<button>', {
                text: 'Close'
            });
            closeButton.on('click', (event) => {
                $(messageDiv).html(oldMessage);
            });

            $(messageDiv).empty();
            $(messageDiv)
                .append(editArea)
                .append(saveButton)
                .append(closeButton);
        });

        let deleteButton = $('<button>', {
            text: 'Delete',
            class: 'delete-buttons'
        });
        deleteButton.on('click', (event) => {
            socket.emit('delete-message', event.currentTarget.parentNode.id);

            event.currentTarget.parentNode.nextSibling.remove()
            event.currentTarget.parentNode.remove();
        });

        if (user == currentUser) {
            messageBox
                .append(usernameLink)
                .append(chatMessage)
                .append(deleteButton)
                .append(editButton);
            $('#messages').append(messageBox);
        } else {
            messageBox
                .append(usernameLink)
                .append(chatMessage);
            $('#messages').append(messageBox);
        }
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