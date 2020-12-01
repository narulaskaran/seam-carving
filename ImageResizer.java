import javax.imageio.*;
import java.io.*;
import java.awt.image.*;
import java.awt.Color;

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
   * Shrinks the image horizontally by #{pixels} pixels
   * @param pixels number of pixel seams to remove from the image
   */
  public void resize(int pixels) {
    checkState();

    // shrink by #{pixels} columns
    for (int seams = 0; seams < pixels; seams++) {
      if (seams % 10 == 0) {
        System.out.println(seams);
        this.export("./resized/"+ seams + ".png");
      }
      this.image = this.carveVerticalSeam();
    }
  }

  /**
   * Removes the lowest energy vertical seam from the image.
   * @return a new BufferedImage instance with one seam of pixels removed
   */
  public BufferedImage carveVerticalSeam() {
    // store individual energy levels
    double[][] energy = new double[image.getHeight()][image.getWidth()];
    // store back pointers
    int[][] ptr = new int[image.getHeight()][image.getWidth()];

    // calculate individual pixel energy levels
    for (int row = 0; row < energy.length; row++) {
      for (int col = 0; col < energy[0].length; col++) {
        energy[row][col] = (new Pixel(row, col)).energyLevel();
        ptr[row][col] = -1;
      }
    }

    // calculate seam energy levels and store back pointers
    for (int row = 1; row < energy.length; row++) {
      for (int col = 0; col < energy[0].length; col++) {
        double min = energy[row - 1][col];
        int parent = col;

        if (col - 1 >= 0 && Math.min(min, energy[row - 1][col - 1]) != min) {
          min = Math.min(min, energy[row - 1][col - 1]);
          parent = col - 1;
        }
        if (col + 1 < image.getWidth() && Math.min(min, energy[row - 1][col + 1]) != min) {
          min = Math.min(min, energy[row - 1][col + 1]);
          parent = col + 1;
        }

        energy[row][col] += min;
        ptr[row][col] = parent;
      }
    }

    // Copy over image data minus the low-energy seam
    BufferedImage output = new BufferedImage(image.getWidth() - 1, image.getHeight(), BufferedImage.TYPE_INT_ARGB);
    int row = output.getHeight() - 1;
    int tail = mindex(energy[row]);
    for (; row >= 0; row--) {
      int imagePtr = 0;
      for (int col = 0; col < output.getWidth(); col++) {
        if (imagePtr == tail) {
          imagePtr++;
        }
        output.setRGB(col, row, image.getRGB(imagePtr, row));
        imagePtr++;
      }
      tail = ptr[row][tail];
    }

    return output;
  }

  /**
   * Exports the resized image to the same directory as the original.
   *
   * @return returns true if image is exported successfully, false otherwise
   */
  public boolean export(String outputPath) {
    checkState();
    try {
      File outputFile = new File(outputPath);
      ImageIO.write(this.image, "png", outputFile);
      return true;
    } catch (IOException e) {
      System.out.println(String.format("Error exporting image with message:%n%s", e.getMessage()));
      return false;
    }
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
   * Finds the index of the smallest element of a double[]
   *
   * @param arr array of doubles
   * @return the index of the smallest element in the array
   */
  private int mindex(double[] arr) {
    if (arr.length == 0) {
      return -1;
    }

    double min = arr[0];
    int mindex = 0;
    for (int i = 0; i < arr.length; i++) {
      if (arr[i] < min) {
        min = arr[i];
        mindex = i;
      }
    }

    return mindex;
  }

  /**
   * Container class to hold color information for a particular pixel
   */
  private class Pixel {
    int row;
    int col;
    int r;
    int g;
    int b;

    /**
     * Creates a new Pixel instance
     * @param row y coordinate of the pixel
     * @param col x coordinate of the pixel
     */
    public Pixel(int row, int col) {
      this.row = row;
      this.col = col;

      Color color = new Color(image.getRGB(col, row));
      this.r = color.getRed();
      this.g = color.getGreen();
      this.b = color.getBlue();
    }

    /**
     * Calculates the energy level of an individual pixel
     * @return energy level for this pixel
     */
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

    /**
     * Calculate the energy difference between this pixel and the provided on
     * @param other the other pixel instance to calculate energy offsets with
     */
    public double calculateEnergyDiff(Pixel other) {
      return Math.pow((this.r - other.r), 2) + Math.pow((this.g - other.g), 2) + Math.pow((this.b - other.b), 2);
    }
  }

  /**
   * For running the class
   */
  public static void main(String[] args) {
    try {
      ImageResizer tool = new ImageResizer("./img/dog.jpg");
      tool.resize(700);
    } catch (Exception e) {
      System.out.println(String.format("Local class testing failed with the following message:%n%s", e.getMessage()));
      e.printStackTrace();
    }
  }
}