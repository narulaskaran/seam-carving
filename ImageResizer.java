import javax.imageio.*;
import java.io.*;
import java.awt.image.*;
import java.awt.color.*;

/**
 * Class to resize images in a content-aware manner. Implements the Seam Carving
 * DP algorithm.
 */
public class ImageResizer {
  String path;
  private BufferedImage image;
  ColorModel rgb;

  /**
   * Creates a new ImageResizer instance.
   *
   * @param path a path to the image
   * @throws IOException thrown if there is a problem reading the image
   */
  public ImageResizer(String path) throws IOException {
    this.path = path;
    this.image = ImageIO.read(new File(path));
    this.rgb = image.getColorModel();
  }

  // TODO: implement runner to call carveVerticalSeam() multiple times in a loop
  public void resize(int pixels) {
    checkState();

    // shrink by #{pixels} columns
    for (int seams = 0; seams < pixels; seams++) {

    }
  }

  public void carveVerticalSeam() {
    // calculate individual pixel energy levels
    double[][] energy = new double[image.getHeight()][image.getWidth()];
    for (int row = 0; row < energy.length; row++) {
      for (int col = 0; col < energy[0].length; col++) {
        energy[row][col] = (new Pixel(row, col)).energyLevel();
      }
    }

    // calculate seam energy levels
    for (int row = 1; row < energy.length; row++) {
      for (int col = 0; col < energy[0].length; col++) {
        double min = energy[row - 1][col];
        if (col - 1 >= 0) {
          min = Math.min(min, energy[row - 1][col - 1]);
        }
        if (col + 1 < image.getWidth()) {
          min = Math.min(min, energy[row - 1][col + 1]);
        }

        energy[row][col] += min;
      }
    }

    // TODO: trace through the energy matrix to identify the seam path
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

  /**
   * Container class to hold row/col indices for a particular pixel
   */
  private class Pixel {
    int row;
    int col;
    int r;
    int g;
    int b;

    public Pixel(int row, int col) {
      this.row = row;
      this.col = col;

      int pixel = row * image.getWidth() + col;
      this.r = rgb.getRed(pixel);
      this.g = rgb.getGreen(pixel);
      this.b = rgb.getBlue(pixel);
    }

    public double energyLevel() {
      double energyX = 0;
      double energyY = 0;

      if (row == 0) {
        energyX = this.calculateEnergyDiff(new Pixel(row + 1, col));
      } else if (row == image.getHeight() - 1) {
        energyX = this.calculateEnergyDiff(new Pixel(row - 1, col));
      } else {
        energyX = (new Pixel(row - 1, col)).calculateEnergyDiff(new Pixel(row + 1, col));
      }

      if (col == 0) {
        energyY = this.calculateEnergyDiff(new Pixel(row, col + 1));
      } else if (col == image.getWidth() - 1) {
        energyY = this.calculateEnergyDiff(new Pixel(row, col - 1));
      } else {
        energyY = (new Pixel(row, col - 1)).calculateEnergyDiff(new Pixel(row, col + 1));
      }

      return energyX + energyY;
    }

    public double calculateEnergyDiff(Pixel other) {
      return Math.pow((this.r - other.r), 2) + Math.pow((this.g - other.g), 2) + Math.pow((this.b - other.b), 2);
    }
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