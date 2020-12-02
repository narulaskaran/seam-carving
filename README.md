# Seam Carving
Implementation of the seam carving algorithm for content-aware image resizing.

Shout out to Avik Das' explanation of the algorithm [here.](https://avikdas.com/2019/05/14/real-world-dynamic-programming-seam-carving.html)

# Examples
Some source images turned out better than others. The quality of the output is also dependent on how many iterations we put the photos through. Objects and edges in photos are more likely to become skewed as we identify and remove larger number of seams.

## Wall (good)
![Wall resizing gif](resized/wall.gif)

## Stage (decent)
![Stage resizing gif](resized/stage.gif)

## Dog (bad)
![Dog resizing gif](resized/dog.gif)

# Next steps
I currently only implemented vertical seam carving (shrinking the image horizontally). I want to implement vertical shrinking as well.

Being able to resize images vertically and horizontally opens up the ability to scale images down proportionally,
rather than always skewing the dimensions of the source file. 

One possibility would be to build this into a web service, giving me the opportunity to work on RESTful API development in Java using [Spring](https://spring.io/).