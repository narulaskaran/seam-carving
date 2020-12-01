import javax.imageio.*;
import java.io.*;
import java.awt.image.*;

/**
 * Class to resize images in a content-aware manner. Implements the Seam Carving
 * DP algorithm.
 */
public class ImageResizer {
  String path;
  private BufferedImage image;

  /**
   * Creates a new ImageResizer instance.
   *
   * @param path a path to the image
   * @throws IOException thrown if there is a problem reading the image
   */
  public ImageResizer(String path) throws IOException {
    this.path = path;
    this.image = ImageIO.read(new File(path));
  }

  /**
   * Checks the state invariant for the class to make sure it never occupies an
   * illegal state.
   *
   * @throws IllegalStateException thrown if ImageResizer instance is not valid
   */
  private void checkState() {
    if (image == null) {
      throw new IllegalStateException();
    }
  }

  public void resize() {
    checkState();
  }

  /**
   * Exports the resized image to the same directory as the original.
   *
   * @return returns true if image is exported successfully, false otherwise
   */
  public boolean export() {
    checkState();
    return false;
  }

  /**
   * For testing the class
   */
  public static void main(String[] args) {
    try {
      ImageResizer tool = new ImageResizer("img/stage.jpg");
      tool.resize();
      boolean exported = tool.export();

      if (!exported) {
        throw new Exception("Failed to export image");
      }
    } catch (Exception e) {
      System.out.println(String.format("Local class testing failed with the following message:%n%s", e.getMessage()));
    }
  }
}