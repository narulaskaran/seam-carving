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
   * Scales down the image by the provided ratio. Shrinks using seam carving
   * technique.
   * 
   * @param ratio percentage of the original image size
   */
  public void resize(double ratio) {
    checkState();
    ratio = 1 - ratio;

    // calculate num pixels to remove in each direction
    int vert = (int) (image.getHeight() * ratio);
    int hor = (int) (image.getHeight() * ratio);

    // set up progress calc
    double originalHeight = this.image.getHeight();
    double originalWidth = this.image.getWidth();
    int progress = 0;

    while (vert-- > 0 && hor-- > 0) {
      if (progress++ % 8 == 0) {
        this.export("./resized/" + progress + ".png");
        System.out.println(Math.abs(1 - ((this.image.getHeight() / originalHeight + this.image.getWidth() / originalWidth) / 2)) / ratio);
      }
      this.image = this.carveVerticalSeam();
      this.image = this.carveHorizontalSeam();
    }

    boolean vertical = vert != 0;
    for (int i = 0; i < Math.max(vert, hor); i++) {
      if (vertical) {
        this.image = this.carveVerticalSeam();
      } else {
        this.image = this.carveHorizontalSeam();
      }
    }

    this.export("./resized/shrunk.png");
  }

  /**
   * Removes the lowest energy vertical seam from the image.
   * 
   * @return a new BufferedImage instance with one seam of pixels removed
   */
  private BufferedImage carveVerticalSeam() {
    // store individual energy levels
    double[][] energy = new double[image.getHeight()][image.getWidth()];
    // store back pointers
    int[][] ptr = new int[image.getHeight()][image.getWidth()];

    calcInitEnergyLevels(energy);

    // calculate seam energy levels and store back pointers
    for (int row = 1; row < energy.length; row++) {
      for (int col = 0; col < energy[0].length; col++) {
        double min = energy[row - 1][col];
        int parent = col;

        if (col - 1 >= 0 && energy[row - 1][col - 1] < min) {
          min = Math.min(min, energy[row - 1][col - 1]);
          parent = col - 1;
        }
        if (col + 1 < image.getWidth() && energy[row - 1][col + 1] < min) {
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
   * Removes the lowest energy horizontal seam from the image.
   * 
   * @return a new BufferedImage instance with one seam of pixels removed
   */
  private BufferedImage carveHorizontalSeam() {
    // store individual energy levels
    double[][] energy = new double[image.getHeight()][image.getWidth()];
    // store back pointers
    int[][] ptr = new int[image.getHeight()][image.getWidth()];

    calcInitEnergyLevels(energy);

    // calculate seam energy levels and store back pointers
    for (int col = 1; col < energy[0].length; col++) {
      for (int row = 0; row < energy.length; row++) {
        double min = energy[row][col - 1];
        int parent = row;

        if (row - 1 >= 0 && energy[row - 1][col - 1] < min) {
          min = energy[row - 1][col - 1];
          parent = row - 1;
        }
        if (row + 1 < image.getHeight() && energy[row + 1][col - 1] < min) {
          min = energy[row + 1][col - 1];
          parent = row + 1;
        }

        energy[row][col] += min;
        ptr[row][col] = parent;
      }
    }

    // find lowest energy seam tail
    BufferedImage output = new BufferedImage(image.getWidth(), image.getHeight() - 1, BufferedImage.TYPE_INT_ARGB);
    int col = output.getWidth() - 1;
    double[] endCol = new double[image.getHeight()];
    extractColumn(energy, endCol, col);
    int tail = mindex(endCol);

    // Copy over image data minus the low-energy seam
    for (; col >= 0; col--) {
      int imagePtr = 0;
      for (int row = 0; row < output.getHeight(); row++) {
        if (imagePtr == tail) {
          imagePtr++;
        }
        output.setRGB(col, row, image.getRGB(col, imagePtr));
        imagePtr++;
      }
      tail = ptr[tail][col];
    }

    return output;
  }

  /**
   * Extract a specified column from a 2D array. Populates the param values with
   * the values in column col from array arr
   * 
   * @param arr    2D matrix with x rows and y columns
   * @param values the output array of length x
   * @param col    column index between 0 and y - 1
   */
  private void extractColumn(double[][] arr, double[] values, int col) {
    if (arr.length != values.length || col < 0 || col > arr[0].length) {
      throw new IllegalArgumentException();
    }

    for (int row = 0; row < arr.length; row++) {
      values[row] = arr[row][col];
    }
  }

  /**
   * Fill array with initial energy levels of each pixel in this.image
   * 
   * @param arr 2D array of doubles with same dimensions as this.image
   */
  private void calcInitEnergyLevels(double[][] arr) {
    if (arr.length != this.image.getHeight() || arr[0].length != this.image.getWidth()) {
      throw new IllegalArgumentException();
    }
    for (int row = 0; row < arr.length; row++) {
      for (int col = 0; col < arr[0].length; col++) {
        arr[row][col] = (new Pixel(row, col)).energyLevel();
      }
    }
  }

  /**
   * Exports the resized image to the same directory as the original.
   *
   * @return returns true if image is exported successfully, false otherwise
   */
  private boolean export(String outputPath) {
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
     * 
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
     * 
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
     * 
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
      (new ImageResizer("./img/surfer.jpg")).resize(0.5);
    } catch (Exception e) {
      System.out.println(String.format("Local class testing failed with the following message:%n%s", e.getMessage()));
      e.printStackTrace();
    }
  }
}