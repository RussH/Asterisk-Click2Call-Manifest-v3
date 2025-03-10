$(document).ready(function () {
    // Hide "Clear History" button initially
    $("#clearhistory").hide();

    // Load history from storage
    chrome.storage.local.get(["history"], function (result) {
        const history = result.history || [];

        history.forEach(function (entry) {
            if (entry.from && entry.time) {
                const date = new Date(entry.time);
                const formattedDate =
                ("0" + date.getDate()).slice(-2) +
                "/" +
                (date.getMonth() + 1) +
                "/" +
                (date.getFullYear() - 2000) +
                " " +
                date.toTimeString().split(" ")[0];

                const duration =
                entry.answered && entry.ended
                ? Math.floor((entry.ended - entry.answered) / 1000) + " sec"
                : "";

                const rowClass =
                entry.direction === "inbound"
                ? "success"
                : entry.direction === "outgoing"
                ? "info"
                : "danger";

                const icon =
                entry.direction === "inbound"
                ? '<span class="fa fa-arrow-down" aria-hidden="true"></span>'
                : '<span class="fa fa-arrow-up" aria-hidden="true"></span>';

                const row = `
                <tr class="${rowClass} small">
                <td>${icon}</td>
                <td>${formattedDate}</td>
                <td><a href="#" class="call-link">${entry.from}</a></td>
                <td>${duration}</td>
                </tr>
                `;

                $("#history tbody").append(row);
                $("#clearhistory").show();
            }
        });

        // Initialize DataTable
        $.fn.dataTable.moment("DD/MM/YYYY HH:mm:ss");
        const table = $("#history").DataTable({
            order: [[1, "desc"]],
            lengthChange: false,
            columnDefs: [{ type: "natural", targets: 2 }],
        });

        // Handle row clicks for calling
        $("#history").on("click", "tr", function () {
            const rowData = table.row(this).data();
            if (rowData) {
                const phone = rowData[2];
                console.log("Calling phone:", phone);
                chrome.runtime.sendMessage({ phone: phone });
            }
        });

        // Handle "Clear History" button click
        $("#clearhistory").on("click", function () {
            chrome.storage.local.set({ history: [] });
            table.clear().draw();
            $("#clearhistory").hide();
        });
    });
});
