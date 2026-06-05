# Silver Spurs Club <a href="http://silverspurclub.org/"><img class = "rounded" src="twitter-card-preview_frog-small.png" align="right" style="margin: 20px 10px 20px 10px;" alt="" height="200"/></a>

[http://silverspurclub.org/](http://silverspurclub.org/)

This is the GitHub repository for the Silver Spurs website. On the website, you can find:

  * **About**: Information about our club
  *  **Posts**: Blog posts or information about special events
  *  **Events**: Information about events held by the Silver Spurs Club

We are happy to take suggestions for future posts or how-to articles. To send a suggestion, please email silverspurbarrelseries@gmail.com.

## Deployment

This is a Quarto website. Edit the `.qmd` source files, then let GitHub
Actions render and deploy the static site to GitHub Pages.

To enable deployment:

1. Push the repository to GitHub.
2. In the repository settings, go to **Pages**.
3. Set the Pages source to **GitHub Actions**.
4. Push to `main`, or run the **Deploy Quarto site** workflow manually.

The workflow renders the site with `quarto render` and publishes the `_site`
directory. After testing on GitHub Pages, configure `silverspurclub.org` as the
custom domain in the repository Pages settings and update the domain DNS records.
