import triad_openvr
import time
import sys
import struct
import socket
import numpy as np
from math import sin, cos


def euler_angles_to_rotation_matrix(euler_angles):
    """
    将欧拉角转换为旋转矩阵
    """
    roll, pitch, yaw = euler_angles
    c1 = cos(roll)
    s1 = sin(roll)
    c2 = cos(pitch)
    s2 = sin(pitch)
    c3 = cos(yaw)
    s3 = sin(yaw)
    R = np.array([
        [c2*c3, -c2*s3, s2],
        [c1*s3 + c3*s1*s2, c1*c3 - s1*s2*s3, -c2*s1],
        [s1*s3 - c1*c3*s2, c3*s1 + c1*s2*s3, c1*c2]
    ])
    return R


def compute_transformation_matrix_euler(pos_A, euler_A, pos_B, euler_B):
    """
    计算坐标系A到坐标系B的转换矩阵
    """
    # 将欧拉角转换为旋转矩阵
    R_A = euler_angles_to_rotation_matrix(euler_A)
    R_B = euler_angles_to_rotation_matrix(euler_B)

    # 计算坐标系A在坐标系B中的位置和旋转矩阵
    t_A_B = np.array([pos_A[0]-pos_B[0], pos_A[1]-pos_B[1], pos_A[2]-pos_B[2], 1])
    R_A_B = np.dot(R_B, R_A.T)

    # 组合为转换矩阵M
    M = np.zeros((4, 4))
    M[:3, :3] = R_A_B
    M[:3, 3] = t_A_B[:3]
    M[3, 3] = 1

    return M


def quaternion_to_rotation_matrix(q):
    """
    将四元数转换为旋转矩阵
    """
    qw, qx, qy, qz = q
    R = np.array([
        [1 - 2*qy*qy - 2*qz*qz, 2*qx*qy - 2*qz*qw, 2*qx*qz + 2*qy*qw],
        [2*qx*qy + 2*qz*qw, 1 - 2*qx*qx - 2*qz*qz, 2*qy*qz - 2*qx*qw],
        [2*qx*qz - 2*qy*qw, 2*qy*qz + 2*qx*qw, 1 - 2*qx*qx - 2*qy*qy]
    ])
    return R


def compute_transformation_matrix_quaternion(pos_A, quat_A, pos_B, quat_B):
    """
    计算坐标系A到坐标系B的转换矩阵
    """
    # 将四元数转换为旋转矩阵
    R_A = quaternion_to_rotation_matrix(quat_A)
    R_B = quaternion_to_rotation_matrix(quat_B)

    # 计算坐标系A在坐标系B中的位置和旋转矩阵
    t_A_B = np.array([pos_A[0]-pos_B[0], pos_A[1]-pos_B[1], pos_A[2]-pos_B[2], 1])
    R_A_B = np.dot(R_B, R_A.T)

    # 组合为转换矩阵M
    M = np.zeros((4, 4))
    M[:3, :3] = R_A_B
    M[:3, 3] = t_A_B[:3]
    M[3, 3] = 1

    return M


sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
server_address = ('10.79.251.9', 41234) # set the IP address of the server

v = triad_openvr.triad_openvr()
v.print_discovered_objects()

if len(sys.argv) == 1:
    # interval = 1/250
    interval = 1 / 50
elif len(sys.argv) == 2:
    interval = 1 / float(sys.argv[1])
else:
    print("Invalid number of arguments")
    interval = False

transition_flag = True
initial_flag = True
if interval:
    while True:
        try:
            start = time.time()
            # data = v.devices["hmd_1"].get_pose_euler()
            # data = v.devices["tracker_1"].get_pose_euler()
            data = v.devices["tracker_1"].get_pose_quaternion() # for hybrid vis project
            # data = v.devices["tracker_2"].get_pose_euler()
            # data.extend(v.devices["tracker_2"].get_pose_euler())
            station = v.devices["tracking_reference_1"].get_pose_euler()
            # station = v.devices["tracking_reference_1"].get_pose_quaternion()


            if initial_flag:
                initial_flag = False
                initial_data = data.copy()
            # print('inital: ', initial_data)

            for i in range(3):
                data[i] = data[i] - initial_data[i]
            print(data)

            data_tmp = data.copy()
            data[0] = -data_tmp[2]
            data[1] = data_tmp[1]
            data[2] = data_tmp[0]
            sent = sock.sendto(struct.pack('d' * len(data), *data), server_address)
            sleep_time = interval - (time.time() - start)
            if sleep_time > 0:
                time.sleep(sleep_time)
        except BaseException as e:
            print('No signal')
            # print(e)
