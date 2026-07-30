document.getElementById("searchBtn").addEventListener("click", function(){

    let value = document.getElementById("searchInput").value;

    if(value.trim() === ""){
        alert("Please type something");
        return;
    }

    alert("You searched for: " + value);

});