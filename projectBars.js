// project Bars Interaction
document.addEventListener('DOMContentLoaded', function () {
    // find all project bars
    const projectBars = document.querySelectorAll('.project-bar');

    // add click event to each bar
    projectBars.forEach(bar => {
        bar.addEventListener('click', function () {
            this.classList.toggle('expanded');

            // get the project content for this bar
            const content = this.querySelector('.project-content');

            // if expanded, show content
            if (this.classList.contains('expanded')) {
                // Set a larger height for the expanded bar
                this.style.height = (content.scrollHeight + 100) + 'px';
                content.style.maxHeight = content.scrollHeight + 'px';

                //design is to only have one bar expanded at a time, so collapse other bars
                projectBars.forEach(otherBar => {
                    if (otherBar !== this && otherBar.classList.contains('expanded')) {
                        otherBar.classList.remove('expanded');
                        otherBar.style.height = '100px';
                        otherBar.querySelector('.project-content').style.maxHeight = '0';
                    }
                });
            } else {
                this.style.height = '80px';
                content.style.maxHeight = '0';
            }
        });
    });
});